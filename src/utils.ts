import { type jsPDFOptions } from "jspdf";
import { type Options as Html2canvasOptions } from "html2canvas";

// 克隆当前元素的内容，放到特定宽度的容易内，以此容易生成特定宽度比的PDF
export interface AdaptiveOptions {
  // 设置生成PDF的宽度，默认800px
  pdfWidth?: number;
  // 设置生成的特定PDF容器挂载的父元素，默认 body
  parentElement?: HTMLElement;
  // 克隆容器无法克隆canvas视图，需要对克隆内容进行重新渲染
  resetView?: (element: Element) => void;
  // 图表绘制时间延迟
  resetViewDelay?: number;
}

// 导出PDF参数
export interface PdfOptions {
  // 文件名
  name?: string;
  // 整体块的class名称，生成pdf时作为整体处理，不会被分页切割
  monoblockClassName?: string | string[];
  // 放大倍数，默认2倍，使导出的pdf更加清晰
  scale?: number;
  // PDF 页面边距，只能设置大于等于0数字，默认 10(px)
  // 为了文本内容不被截断，top 和 bottom 值必须大于 0
  // 当设置页眉时，top 固定为 16，设置页脚式，bottom 固定为 16
  margin?: number | number[];
  // 忽略的元素，不作页面内容计算，通常一些UI组件库会有特殊标签，但非计算内容，会影响截断内容判断，
  // 例：arco-design vue 组件库中，table表格，会生成 colgroup 标签，影响分页逻辑，需要过滤内容
  ignoreElement?: (element: Element) => Element[];
  // 需要重置样式的标签，默认h1-h6 (目前只遇到margin样式的问题)
  resetStyleTags?: string[];
  // 页眉文案
  header?: string;
  // 表头对齐方式
  headerAlign?: "left" | "center" | "right";
  // 页脚文案
  footer?: string;
  // 页脚对齐方式
  footerAlign?: "left" | "center" | "right";
  // 开启PDF宽度自适应模式, 默认 true
  adaptive?: boolean;
  adaptiveOptions?: AdaptiveOptions;
  jsPDFOptions?: jsPDFOptions;
  html2CanvasOptions?: Partial<Html2canvasOptions>;
}
export interface PageMargin {
  left: number;
  top: number;
  right: number;
  bottom: number;
}
// 绘制单页参数
export interface SinglePageOptions {
  // 页面边距
  pageMargin: PageMargin;
  // 转化宽度比
  cRatio: number;
  // PDF 单页宽度
  pageHeight: number;
  // 绘制图片的 y 轴坐标
  y: number;
  // 绘制图片的 canvas 高度
  canvasHeight: number;
  // 当前页码
  page: number;
}
// 等待所有图片加载完成，生成完整的pdf文件
export async function waitForImagesLoaded(element: Element) {
  // 获取元素内的所有图片
  const images = element.querySelectorAll("img");
  // 如果没有图片，直接返回
  if (images.length === 0) return Promise.resolve();
  // 创建一个Promise数组，每个图片对应一个Promise
  const imagePromises = Array.from(images).map((img) => {
    // 解决图片奇怪边距，导致的高度计算问题
    if (img.style.display !== "block") {
      img.style.verticalAlign = img.style.verticalAlign || "bottom";
    }
    // 如果图片已经加载完成，直接返回resolved的Promise
    if (img.complete) {
      return Promise.resolve();
    }
    // 否则，创建一个新的Promise，在图片加载完成或出错时resolve
    return new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = () => {
        resolve(false); // 即使图片加载失败也继续处理
      };
    });
  });
  // 等待所有图片加载完成
  return Promise.all(imagePromises);
}
// 重置基础样式，因为html2canvas组件在导出图片时，会增加一些默认样式，故需要提前设置
export async function resetBaseStyle(element: Element, tags: string[]) {
  let list: Element[] = [];
  tags.forEach((tag) => {
    const elements = element.querySelectorAll(tag);
    list = list.concat(Array.from(elements));
  });
  list.forEach((el) => {
    const style = window.getComputedStyle(el);
    const { marginTop, marginBottom, marginLeft, marginRight } = style;
    (el as HTMLElement).style.margin = `${marginTop || 0} ${marginRight || 0} ${
      marginBottom || 0
    } ${marginLeft || 0}`;
  });
}
// 获取行高
export function getLineHeight(style: CSSStyleDeclaration) {
  if (style.lineHeight === "normal") {
    // 如果line-height为normal，则使用字体大小作为行高
    return parseFloat(style.fontSize);
  } else if (style.lineHeight.includes("px")) {
    // 否则，使用line-height作为行高
    return parseFloat(style.lineHeight);
  }
  return Number(style.lineHeight) * parseFloat(style.fontSize);
}

export function createPdfWrap(element: Node | Element, width: number) {
  // 设置特定宽度，使内容展现更好的视觉效果
  const pdfEl = document.createElement("div");
  pdfEl.appendChild(element);
  pdfEl.style.width = width + "px";
  pdfEl.style.position = "absolute";
  pdfEl.style.left = "0";
  pdfEl.style.top = "0";
  pdfEl.style.zIndex = "-99";
  pdfEl.style.left = "-99999px";
  pdfEl.style.top = "-99999px";
  pdfEl.style.opacity = "0";
  return pdfEl;
}

export function drawPdfSinglePage(
  canvas: HTMLCanvasElement,
  options: SinglePageOptions & PdfOptions
) {
  // 根据节点位置，重新绘制分页图片，灵活管理分页切断
  const { pageMargin, cRatio, pageHeight } = options;
  const partCanvas = document.createElement("canvas");
  partCanvas.width =
    canvas.width + Math.floor(cRatio * (pageMargin.left + pageMargin.right));
  partCanvas.height = Math.floor(cRatio * pageHeight);
  const partCtx = partCanvas.getContext("2d");
  if (partCtx) {
    partCtx.fillStyle = "#fff";
    partCtx.fillRect(0, 0, partCanvas.width, partCanvas.height);
    partCtx.font = Math.floor(cRatio * 8) + "px 微软雅黑"; // 设置字体大小和类型
    partCtx.fillStyle = "#999"; // 设置填充颜色
    partCtx.textBaseline = "top";
    if (options.header) {
      const headerAlign = options.headerAlign || "left";
      partCtx.textAlign = headerAlign;
      let hX = Math.floor(cRatio * pageMargin.left);
      if (headerAlign === "center") {
        hX = partCanvas.width / 2;
      } else if (headerAlign === "right") {
        hX = partCanvas.width - Math.floor(cRatio * pageMargin.right);
      }
      partCtx.fillText(
        options.header,
        hX,
        Math.floor(cRatio * 4),
        canvas.width
      );
    }
    if (options.footer) {
      const footerAlign = options.footerAlign || "right";
      partCtx.textAlign = footerAlign;
      let fX = Math.floor(cRatio * pageMargin.left);
      if (footerAlign === "center") {
        fX = partCanvas.width / 2;
      } else if (footerAlign === "right") {
        fX = partCanvas.width - Math.floor(cRatio * pageMargin.right);
      }
      partCtx.fillText(
        options.footer.replace("{page}", `${options.page}`),
        fX,
        Math.floor(cRatio * (pageHeight - 12)),
        canvas.width
      );
    }
    partCtx.drawImage(
      canvas,
      0,
      options.y,
      canvas.width,
      options.canvasHeight,
      Math.floor(cRatio * pageMargin.left),
      Math.floor(cRatio * pageMargin.top),
      canvas.width,
      options.canvasHeight
    );
  }
  return partCanvas.toDataURL("image/jpeg", 1);
}
export function isNumber(data: unknown): data is number {
  return typeof data === "number" && !isNaN(data);
}
export function getPageMargin(margin?: number | number[]): PageMargin {
  const pageMargin: PageMargin = {
    top: 10,
    left: 10,
    bottom: 10,
    right: 10,
  };
  if (getLegalMargin(margin)) {
    margin = [margin, margin, margin, margin];
  }
  if (Array.isArray(margin)) {
    pageMargin.top =
      getLegalMargin(margin[0]) && margin[0] > 0 ? margin[0] : 10;
    pageMargin.right = getLegalMargin(margin[1]) ? margin[1] : 10;
    pageMargin.bottom = getLegalMargin(margin[2]) ? margin[2] : pageMargin.top;
    pageMargin.left =
      getLegalMargin(margin[3]) && margin[3] > 0 ? margin[3] : margin[1];
  }
  return pageMargin;
}

function getLegalMargin(margin: unknown): margin is number {
  return isNumber(margin) && margin >= 0;
}

export function delay(long: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, long);
  });
}
