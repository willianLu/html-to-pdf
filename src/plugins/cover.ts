import {
  type HtmlToPdfClass,
  type PdfPlugin,
  type SinglePageOptions,
} from "../types";
import html2canvas from "html2canvas";

export interface CoverOptions {
  backgroundColor?: string;
  image?: string;
  fit?: "fill" | "contain" | "cover" | "none";
  text?: string;
  fontSize?: number;
  fontWeight?: string | number;
  fontFamily?: string;
  color?: string;
  element?: HTMLElement;
  elementFit?: "fill" | "contain" | "cover" | "none";
}

export interface CoverPluginOptions {
  cover?: CoverOptions;
  backcover?: CoverOptions;
}

function drawImage(
  image: HTMLImageElement | HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  pageOptions: SinglePageOptions,
  options: CoverOptions
) {
  const { canvasWidth, canvasHeight } = pageOptions;
  let sx = 0;
  let sy = 0;
  let dx = 0;
  let dy = 0;
  let sWidth = image.width;
  let sHeight = image.height;
  let dWidth = canvasWidth;
  let dHeight = canvasHeight;
  const imgRatio = sWidth / sHeight;
  const canRatio = dWidth / dHeight;
  const isImgTag = image.tagName.toLocaleLowerCase() === "img";
  let fit = "";
  if (isImgTag) {
    fit = options.fit || "fill";
  } else {
    fit = options.elementFit || "none";
  }
  switch (fit) {
    case "contain":
      if (imgRatio > canRatio) {
        dHeight = (sHeight * dWidth) / sWidth;
        dy = Math.floor((canvasHeight - dHeight) / 2);
      } else {
        dWidth = (sWidth * dHeight) / sHeight;
        dx = Math.floor((canvasWidth - dWidth) / 2);
      }
      break;
    case "cover":
      if (imgRatio > canRatio) {
        sWidth = sHeight * canRatio;
        sx = Math.floor((image.width - sWidth) / 2);
      } else {
        sHeight = sWidth * canRatio;
        sy = Math.floor((image.height - sHeight) / 2);
      }
      break;
    case "none":
      if (sWidth < dWidth) {
        dx = Math.floor((dWidth - sWidth) / 2);
        dWidth = sWidth;
      } else {
        sx = Math.floor((sWidth - dWidth) / 2);
        sWidth = dWidth;
      }
      if (sHeight < dHeight) {
        dy = Math.floor((dHeight - sHeight) / 2);
        dHeight = sHeight;
      } else {
        dy = Math.floor((sHeight - dHeight) / 2);
        sHeight = dHeight;
      }
      break;
    case "fill":
    default:
      // 默认fill类型
      break;
  }
  ctx.drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
}

async function drawCoverPage(
  htmlPdf: HtmlToPdfClass,
  pageOptions: SinglePageOptions,
  options: CoverOptions
) {
  const { widthRatio, canvasWidth, canvasHeight } = pageOptions;
  const canvas = htmlPdf.createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = options.backgroundColor || "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (options.image) {
      const image = await htmlPdf.loadImage(options.image).catch(() => null);
      if (image) {
        drawImage(image, ctx, pageOptions, options);
      }
    }
    if (options.text) {
      ctx.textAlign = "center";
      const fontSize = options.fontSize || 32;
      const fontFamily = options.fontFamily || "微软雅黑";
      const fontWeight = options.fontWeight || "bold";
      ctx.font = `${fontWeight} ${Math.floor(
        widthRatio * fontSize
      )}px ${fontFamily}`; // 设置字体大小和类型
      ctx.fillStyle = options.color || "#000"; // 设置填充颜色
      const x = canvasWidth / 2;
      const y = canvasHeight / 2;
      ctx.fillText(options.text, x, y, canvasWidth);
    }
    if (options.element) {
      const adaptiveOptions = htmlPdf.options.adaptiveOptions || {};
      const parentElement = adaptiveOptions.parentElement || document.body;
      let clonedElement = options.element;
      let pdfWrap: HTMLDivElement | null = null;
      try {
        if (htmlPdf.options.adaptive !== false) {
          clonedElement = clonedElement.cloneNode(true) as HTMLElement;
          pdfWrap = htmlPdf.createVirtualWrap(
            clonedElement,
            adaptiveOptions?.pdfWidth || 800
          );
          parentElement.appendChild(pdfWrap);
        }
        // 去除部分标签 - h1 - h6，默认的margin样式
        htmlPdf.resetBaseStyle(clonedElement);
        await htmlPdf.waitForImagesLoaded(clonedElement);
        const hCanvas = await html2canvas(clonedElement, {
          scale: htmlPdf.options.scale || 2,
          logging: false,
          useCORS: true,
          backgroundColor: null,
        });
        drawImage(hCanvas, ctx, pageOptions, options);
      } catch (error) {}
      // 删除临时元素
      if (pdfWrap) {
        parentElement.removeChild(pdfWrap);
      }
    }
    const imgData = await canvas.toDataURL("image/jpeg", 1);
    // 将生成的图片添加到-页面图片-管理中
    htmlPdf.addPageImage(imgData);
  }
}

const CoverPlugin: PdfPlugin<CoverPluginOptions> = {
  async beforeDraw(htmlPdf, pageOptions, options) {
    if (options?.cover) {
      return drawCoverPage(htmlPdf, pageOptions, options.cover);
    }
  },
  afterDraw(htmlPdf, pageOptions, options) {
    if (options?.backcover) {
      return drawCoverPage(htmlPdf, pageOptions, options.backcover);
    }
  },
};

export default CoverPlugin;
