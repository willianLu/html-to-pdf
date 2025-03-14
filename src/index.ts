import JsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  PdfOptions,
  AdaptiveOptions,
  PageMargin,
  createPdfWrap,
  drawPdfSinglePage,
  waitForImagesLoaded,
  getLineHeight,
  getPageMargin,
  isNumber,
} from "./utils";
export { type PdfOptions, type AdaptiveOptions };

// 导出为PDF函数
export default async function htmlToPdf(
  wrapElement: HTMLElement,
  options?: PdfOptions
) {
  if (!wrapElement) {
    throw new Error("必须传入元素节点 HTMLElement");
  }
  options = options || {};
  // pdf 临时容器
  let pdfWrap: HTMLDivElement | null = null;
  const adaptiveOptions = options.adaptiveOptions || {};
  const parentElement = adaptiveOptions.parentElement || document.body;
  try {
    let clonedElement = wrapElement;
    if (options.adaptive !== false) {
      clonedElement = wrapElement.cloneNode(true) as HTMLElement;
      pdfWrap = createPdfWrap(clonedElement, adaptiveOptions?.pdfWidth || 800);
      parentElement.appendChild(pdfWrap);
      // 在处理canvas视图时，克隆的节点无法显示，需要重新渲染
      if (adaptiveOptions.resetView) {
        adaptiveOptions.resetView(clonedElement);
      }
    }
    // 等待图片加载完成
    await waitForImagesLoaded(clonedElement);
    // 获取内容盒子距离视扣的相对位置信息，用于后续计算
    const wrapRect = clonedElement.getBoundingClientRect();
    if (options.name && !options.name.endsWith(".pdf")) {
      options.name += ".pdf";
    }
    // 文件名称
    const fileName = options.name || Date.now() + ".pdf";
    // 页面边距（px）
    const margin: PageMargin = getPageMargin(options.margin);
    if (options.header) {
      margin.top = 16;
    }
    if (options.footer) {
      margin.bottom = 16;
    }
    if (!isNumber(options.scale) || options.scale < 0) {
      options.scale = 2;
    }
    // dpr 放大倍数
    const dpr = options.scale;
    // 标记元素为一个块状整体的className
    const monoblockClassName =
      options.monoblockClassName || "html-pdf-monoblock";
    // 初始化jsPDF
    const pdfPage = new JsPDF({
      orientation: "portrait",
      unit: "px",
      format: "a4",
    });
    // 定义A4页面尺寸（px）
    const pageWidth = pdfPage.internal.pageSize.getWidth();
    const pageHeight = pdfPage.internal.pageSize.getHeight();
    // PDF 去除预留边界，单一页面的真实高度
    const realPageHeight = pageHeight - margin.top - margin.bottom;
    // 使用html2canvas捕获元素
    const canvas = await html2canvas(clonedElement, {
      scale: dpr,
      logging: false,
      useCORS: true,
    });
    // 计算图像高度（px）
    const imgWidth = pageWidth - margin.left - margin.right;
    // pdf的宽度 与 canvas的宽度比
    const ratio = imgWidth / canvas.width;
    const imgHeight = canvas.height * ratio;
    // canvas的宽度 与 pdf的宽度比
    const cRatio = canvas.width / imgWidth;
    // pdf单页面的高度
    const pdfPageContentHeight = Math.floor(cRatio * realPageHeight);
    if (margin.top + imgHeight < pageHeight - margin.bottom) {
      // 未超出单页面的高度, 直接导出PDF
      const imgData = drawPdfSinglePage(canvas, {
        ...options,
        y: 0,
        pageMargin: margin,
        cRatio,
        pageHeight,
        canvasHeight: canvas.height,
        page: 1,
      });
      pdfPage.addImage(imgData, "JPEG", 0, 0, pageWidth, pageHeight);
    } else {
      // 记录分页节点位置，默认从 0 位置开始
      const pages = [0];
      // 获取容器的子节点元素
      let elArr: Element[] = Array.from(clonedElement.children);
      // 记录计算中的页面高度，用于满足分页判断
      let pageLong = 0;
      // 记录当前容器已计算到的位置，用于分页节点
      let distance = 0;
      while (elArr.length) {
        const el = elArr.shift() as Element;
        const tagName = el.tagName.toLowerCase();
        const rect = el.getBoundingClientRect();
        // canvas 是通过 dpr 放大，所以真实 dom 需要乘以 dpr
        const elHeight = rect.height * dpr;
        // 当前节点距离视窗顶部的距离
        const wTop = (rect.top - wrapRect.top) * dpr;
        // 该元素到上次计算到的位置的距离
        const top = wTop - distance;
        pageLong += top;
        // 计算中的页面高度超出 PDF 单页高度，则记录该节点位置
        if (pageLong > pdfPageContentHeight) {
          pages.push(distance);
          pageLong -= pdfPageContentHeight;
          distance = wTop - pageLong;
        } else {
          distance = wTop;
        }
        // 当前计算中的页面高度 + 节点元素高度，超出 PDF 单页高度，则说明需要分页
        if (pageLong + elHeight > pdfPageContentHeight) {
          if (
            tagName === "tr" ||
            tagName === "img" ||
            tagName === "svg" ||
            tagName === "canvas" ||
            el.classList.contains(monoblockClassName)
          ) {
            // 两种情况，1: tr 内容不超出单页；2: tr 内容超出单页
            if (elHeight > pdfPageContentHeight) {
              // 超出单页的则正常截取，不考虑截断情况，这种比较少见
              distance += pdfPageContentHeight - pageLong;
              // 一个tr内容占多个单页的情况，需要对这个tr多次分页
              const count = Math.floor(
                (elHeight + pageLong - pdfPageContentHeight) /
                  pdfPageContentHeight
              );
              if (count) {
                for (let i = 0; i < count; i++) {
                  pages.push(distance);
                  distance += pdfPageContentHeight;
                }
              }
            }
            pages.push(distance);
            pageLong = 0;
          } else if (el.children.length) {
            // 存在子节点，深度处理子节点，找到更细粒度子节点
            if (options.ignoreElement) {
              const children = options.ignoreElement(el);
              if (Array.isArray(children)) {
                elArr = [...children, ...elArr];
              }
            } else {
              elArr = [...Array.from(el.children), ...elArr];
            }
          } else {
            const style = window.getComputedStyle(el);
            const lineHeight = getLineHeight(style) * dpr;
            // 计算当前页可以容纳的文字内容行数
            const num = Math.floor(
              (pdfPageContentHeight - pageLong) / lineHeight
            );
            distance += num * lineHeight;
            pages.push(distance);
            pageLong = 0;
          }
        } else {
          // 未超出时，直接累加高度
          pageLong += elHeight;
          distance += elHeight;
        }
      }
      pages.forEach((item, idx) => {
        // 下个节点数据
        const next = pages[idx + 1] || item + pdfPageContentHeight;
        // 根据节点位置，重新绘制分页图片，灵活管理分页切断
        const imgData = drawPdfSinglePage(canvas, {
          ...options,
          y: item,
          pageMargin: margin,
          cRatio,
          pageHeight,
          canvasHeight: next - item,
          page: idx + 1,
        });
        if (idx !== 0) {
          pdfPage.addPage();
        }
        pdfPage.addImage(imgData, "JPEG", 0, 0, pageWidth, pageHeight);
      });
    }
    pdfPage.save(fileName);
  } catch (error) {
    console.error("PDF导出错误:", error);
  } finally {
    if (pdfWrap) {
      parentElement.removeChild(pdfWrap);
    }
  }
}
