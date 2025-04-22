import {
  type HtmlToPdfClass,
  type PageMargin,
  type HeaderOrFooterOptions,
  type SinglePageOptions,
} from "./types";

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

// 处理页眉页脚的文案
export function handleHeaderOrFooterText(
  ctx: CanvasRenderingContext2D,
  pageOptions: SinglePageOptions,
  options: HeaderOrFooterOptions,
  type: "header" | "footer" = "header"
) {
  const { widthRatio, pageMargin, page, totalPage, canvasWidth, canvasHeight } =
    pageOptions;

  const align = options.align || (type === "header" ? "left" : "right");
  ctx.textAlign = align;
  const fontSize = options.fontSize || 8;
  const fontFamily = options.fontFamily || "微软雅黑";
  ctx.font = Math.floor(widthRatio * fontSize) + "px " + fontFamily; // 设置字体大小和类型
  ctx.fillStyle = options.color || "#999"; // 设置填充颜色
  let x = Math.floor(widthRatio * pageMargin.left);
  if (align === "center") {
    x = canvasWidth / 2;
  } else if (align === "right") {
    x = canvasWidth - Math.floor(widthRatio * pageMargin.right);
  }
  // 距离底部距离，最小为0
  let spaceBetween =
    ((type === "header" ? pageMargin.top : pageMargin.bottom) - fontSize) / 2;
  if (spaceBetween < 0) {
    spaceBetween = 0;
  }
  let y = 0;
  if (type === "header") {
    y = Math.floor(widthRatio * spaceBetween);
  } else {
    y = canvasHeight - Math.floor(widthRatio * (spaceBetween + fontSize));
  }
  const text = (options.text || "")
    .replace("{page}", `${page}`)
    .replace("{totalPage}", `${totalPage}`);
  ctx.fillText(text, x, y, canvasWidth);
}

export function handleHeaderOrFooterImage(
  ctx: CanvasRenderingContext2D,
  pageOptions: SinglePageOptions,
  options: HeaderOrFooterOptions,
  image: HTMLImageElement,
  type: "header" | "footer" = "header"
) {
  const { widthRatio, pageMargin, canvasWidth, canvasHeight } = pageOptions;
  const imageWidth = options.imageWidth || image.width;
  const imageHeight = options.imageHeight || image.height;
  const align = options.align || (type === "header" ? "left" : "right");
  const imgDrawWidth = Math.floor(widthRatio * imageWidth);
  const imgDrawHeight = Math.floor(widthRatio * imageHeight);
  let x = Math.floor(widthRatio * pageMargin.left);
  if (align === "center") {
    x = (canvasWidth - imgDrawWidth) / 2;
  } else if (align === "right") {
    x = canvasWidth - imgDrawWidth - Math.floor(widthRatio * pageMargin.right);
  }
  // 距离底部距离，最小为0
  const padding = type === "header" ? pageMargin.top : pageMargin.bottom;
  let spaceBetween = (padding - imageHeight) / 2;
  if (spaceBetween < 0) {
    spaceBetween = 0;
  }
  let y = 0;
  if (type === "header") {
    y = Math.floor(widthRatio * spaceBetween);
  } else {
    y = canvasHeight - Math.floor(widthRatio * spaceBetween) - imgDrawHeight;
  }
  ctx.drawImage(image, x, y, imgDrawWidth, imgDrawHeight);
}

export async function drawPdfSinglePage(
  htmlPdf: HtmlToPdfClass,
  canvas: HTMLCanvasElement,
  pageOptions: SinglePageOptions
) {
  // 根据节点位置，重新绘制分页图片，灵活管理分页切断
  const { pageMargin, widthRatio, canvasWidth, canvasHeight } = pageOptions;
  const partCanvas = htmlPdf.createCanvas(canvasWidth, canvasHeight);
  const ctx = partCanvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = htmlPdf.options.backgroundColor || "#fff";
    ctx.fillRect(0, 0, partCanvas.width, partCanvas.height);
    ctx.textBaseline = "top";
    for (let i = 0; i < htmlPdf.plugins.length; i++) {
      const pWrap = htmlPdf.plugins[i];
      // 调用注册插件的 draw 钩子
      if (pWrap.plugin.draw) {
        try {
          await pWrap.plugin.draw(
            htmlPdf,
            ctx,
            pageOptions,
            pWrap.pluginOptions
          );
        } catch (error) {
          console.error("[ draw ] 插件执行失败:", error);
        }
      }
    }
    ctx.drawImage(
      canvas,
      0,
      pageOptions.y,
      pageOptions.contentWidth,
      pageOptions.contentHeight,
      Math.floor(widthRatio * pageMargin.left),
      Math.floor(widthRatio * pageMargin.top),
      pageOptions.contentWidth,
      pageOptions.contentHeight
    );
  }
  return partCanvas.toDataURL("image/jpeg", 1);
}
