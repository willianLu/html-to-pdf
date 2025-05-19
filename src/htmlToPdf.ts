import JsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  getLineHeight,
  getPageMargin,
  isNumber,
  delay,
  drawPdfSinglePage,
} from "./utils";
import {
  type HtmlToPdfClass,
  type PdfOptions,
  type PageMargin,
  type PdfPlugin,
  type PluginWrap,
} from "./types";
import HeaderPlugin from "./plugins/header";
import FooterPlugin from "./plugins/footer";

export default class HtmlToPdf implements HtmlToPdfClass {
  $el!: HTMLElement;
  jsPdf!: JsPDF;
  pdfWidth = 0;
  pdfHeight = 0;
  options: PdfOptions = {};
  plugins: PluginWrap<any>[] = [];
  fileName = "";
  private pageImages: string[] = [];
  constructor(wrapElement: HTMLElement, options?: PdfOptions) {
    if (!wrapElement) {
      throw new Error("必须传入元素节点 HTMLElement");
    }
    options = options || {};
    if (options.name && !options.name.endsWith(".pdf")) {
      options.name += ".pdf";
    }
    if (!isNumber(options.scale) || options.scale <= 0) {
      options.scale = 2;
    }
    this.$el = wrapElement;
    this.options = options;
    // 内置页眉插件
    if (options.header) {
      this.use(HeaderPlugin, options.header);
    }
    // 内置页脚插件
    if (options.footer) {
      this.use(FooterPlugin, options.footer);
    }
    const jsPDFOptions = options.jsPDFOptions || {};
    // 初始化jsPDF
    this.jsPdf = new JsPDF({ format: "a4", ...jsPDFOptions, unit: "px" });
    // PDF 单页的尺寸
    this.pdfWidth = this.jsPdf.internal.pageSize.getWidth();
    this.pdfHeight = this.jsPdf.internal.pageSize.getHeight();
  }
  // 安装插件
  use<T>(plugin: PdfPlugin<T>, pluginOptions?: T) {
    this.plugins.push({
      plugin,
      pluginOptions,
    });
  }
  createVirtualWrap(element: Node | Element, width: number) {
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
  // 创建虚拟的canvas
  createCanvas(width: number, height: number) {
    const newCanvas = document.createElement("canvas");
    newCanvas.width = width;
    newCanvas.height = height;
    return newCanvas;
  }
  // 加载图片
  loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        resolve(img);
      };
      img.onerror = () => {
        reject(new Error("图片加载失败"));
      };
    });
  }
  // 等待图片加载完成
  waitForImagesLoaded(element: Element) {
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
  resetBaseStyle(element: Element) {
    const tags = new Set(
      ["h1", "h2", "h3", "h4", "h5", "h6"].concat(
        this.options.resetStyleTags || []
      )
    );
    let list: Element[] = [];
    tags.forEach((tag) => {
      const elements = element.querySelectorAll(tag);
      list = list.concat(Array.from(elements));
    });
    list.forEach((el) => {
      const style = window.getComputedStyle(el);
      const marginTop = style.marginTop || 0;
      const marginBottom = style.marginBottom || 0;
      const marginLeft = style.marginLeft || 0;
      const marginRight = style.marginRight || 0;
      (
        el as HTMLElement
      ).style.margin = `${marginTop} ${marginRight} ${marginBottom} ${marginLeft}`;
    });
  }
  addPageImage(image: string): void {
    this.pageImages.push(image);
  }
  async getPageImages(): Promise<string[]> {
    if (!this.pageImages.length) {
      await this.buildPageImages();
    }
    return Promise.resolve(this.pageImages);
  }
  private async buildPageImages() {
    const { options, $el } = this;
    // pdf 临时容器
    let pdfWrap: HTMLDivElement | null = null;
    const adaptiveOptions = options.adaptiveOptions || {};
    const parentElement = adaptiveOptions.parentElement || document.body;
    try {
      let clonedElement = $el;
      if (options.adaptive !== false) {
        clonedElement = $el.cloneNode(true) as HTMLElement;
        pdfWrap = this.createVirtualWrap(
          clonedElement,
          adaptiveOptions?.pdfWidth || 800
        );
        parentElement.appendChild(pdfWrap);
        // 在处理canvas视图时，克隆的节点无法显示，需要重新渲染
        if (adaptiveOptions.resetView) {
          adaptiveOptions.resetView(clonedElement);
          // 图表重绘是需要时间的，所以加了延迟，防止图表绘制不全
          // 如果遇到复杂图片，可能依然绘制不全，尝试增加延迟解决
          // 考虑到普遍的现象，如果是大量图表的报告，请不要使用自适应方式
          // 建议使用原DOM导出PDF，可以规避图表重绘问题
          await delay(adaptiveOptions.resetViewDelay || 1000);
        }
      }
      // 去除部分标签 - h1 - h6，默认的margin样式
      this.resetBaseStyle(clonedElement);
      // 等待图片加载完成
      await this.waitForImagesLoaded(clonedElement);
      // 获取内容盒子距离视窗的相对位置信息，用于后续计算
      const wrapRect = clonedElement.getBoundingClientRect();
      // 页面边距（px）
      const margin: PageMargin = getPageMargin(options.margin);
      // dpr 放大倍数
      const dpr = options.scale || 2;
      // 标记元素为一个块状整体的className
      let monoblockClassName: string[] = ["html-pdf-monoblock"];
      if (options.monoblockClassName) {
        if (!Array.isArray(options.monoblockClassName)) {
          monoblockClassName = [options.monoblockClassName];
        } else {
          monoblockClassName = options.monoblockClassName;
        }
      }

      // 初始化pageBreakClassName，作为强制分页的类名
      let pageBreakClassName: string[] = ["html-pdf-page-break"];
      if (options.pageBreakClassName) {
        if (!Array.isArray(options.pageBreakClassName)) {
          pageBreakClassName = [options.pageBreakClassName];
        } else {
          pageBreakClassName = options.pageBreakClassName;
        }
      }

      const { pdfWidth, pdfHeight } = this;
      // PDF 去除预留边界，单一页面的真实高度
      const realPageHeight = pdfHeight - margin.top - margin.bottom;
      const html2CanvasOptions = options.html2CanvasOptions || {};
      // 使用html2canvas捕获元素
      const canvas = await html2canvas(clonedElement, {
        scale: dpr,
        logging: false,
        useCORS: true,
        width: wrapRect.width,
        ...html2CanvasOptions,
      });
      // 换算后的DOM图像宽度（px）
      const imgWidth = pdfWidth - margin.left - margin.right;
      // 换算后的canvas图像的高度（px）
      const imgHeight = canvas.height * (imgWidth / canvas.width);
      // canvas的宽度 与 绘制内容pdf的宽度比
      const widthRatio = canvas.width / imgWidth;
      // pdf单页面的高度
      const pdfPageContentHeight = Math.floor(widthRatio * realPageHeight);
      const singlePageOptions = {
        y: 0,
        pageMargin: margin,
        widthRatio,
        canvasWidth: widthRatio * pdfWidth,
        canvasHeight: widthRatio * pdfHeight,
        contentWidth: 0,
        contentHeight: 0,
        page: 0,
        totalPage: 0,
      };
      for (let i = 0; i < this.plugins.length; i++) {
        const pWrap = this.plugins[i];
        // 调用注册插件的 beforeDraw 钩子
        if (pWrap.plugin.beforeDraw) {
          try {
            await pWrap.plugin.beforeDraw(
              this,
              singlePageOptions,
              pWrap.pluginOptions
            );
          } catch (error) {
            console.error("[ beforeDraw ] 插件执行失败:", error);
          }
        }
      }
      if (margin.top + imgHeight < pdfHeight - margin.bottom) {
        // 未超出单页面的高度, 直接导出PDF
        const imgData = await drawPdfSinglePage(this, canvas, {
          ...singlePageOptions,
          contentWidth: canvas.width,
          contentHeight: canvas.height,
          page: 1,
          totalPage: 1,
        });
        this.pageImages.push(imgData);
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

          // 检查当前元素是否具有pageClass中的类名
          const hasPageClass = pageBreakClassName.some((className) =>
            el.classList.contains(className)
          );

          // 如果元素具有pageClass中的类名，且前面还有内容，则先记录当前位置为分页点
          if (hasPageClass && pageLong > 0) {
            pages.push(distance);
            pageLong = 0;
          }

          // 计算中的页面高度超出 PDF 单页高度，则记录该节点位置
          if (pageLong !== top && pageLong > pdfPageContentHeight) {
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
              monoblockClassName.some((className) =>
                el.classList.contains(className)
              )
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
                elArr = children.concat(elArr);
              } else {
                elArr = Array.from(el.children).concat(elArr);
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

            // 如果元素具有pageClass中的类名，则处理完当前元素后强制分页
            if (hasPageClass) {
              pages.push(distance);
              pageLong = 0;
            }
          }
        }
        for (let i = 0; i < pages.length; i++) {
          const item = pages[i];
          // 下个节点数据
          const next = pages[i + 1] || item + pdfPageContentHeight;
          // 根据节点位置，重新绘制分页图片，灵活管理分页切断
          const imgData = await drawPdfSinglePage(this, canvas, {
            ...singlePageOptions,
            y: item,
            contentWidth: canvas.width,
            contentHeight: next - item,
            page: i + 1,
            totalPage: pages.length,
          });
          this.pageImages.push(imgData);
        }
      }
      for (let i = 0; i < this.plugins.length; i++) {
        const pWrap = this.plugins[i];
        // 调用注册插件的 beforeDraw 钩子
        if (pWrap.plugin.afterDraw) {
          try {
            await pWrap.plugin.afterDraw(
              this,
              singlePageOptions,
              pWrap.pluginOptions
            );
          } catch (error) {
            console.error("[ afterDraw ] 插件执行失败:", error);
          }
        }
      }
    } catch (error) {
      console.error("PDF导出错误:", error);
      throw error;
    } finally {
      if (pdfWrap) {
        parentElement.removeChild(pdfWrap);
      }
    }
  }
  private previewTip() {
    const div = document.createElement("div");
    div.style.position = "fixed";
    div.style.left = "50%";
    div.style.top = "50%";
    div.style.zIndex = "9999";
    div.style.transform = "translate(-50%, -50%)";
    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.justifyContent = "center";
    div.style.padding = "12px";
    div.style.width = "80%";
    div.style.maxWidth = "360px";
    div.style.minHeight = "68px";
    div.style.backgroundColor = "#666";
    div.style.fontSize = "16px";
    div.style.color = "#fff";
    div.innerText = "正在制作中...";
    return div;
  }
  // 预览模式
  async preview() {
    const html = `<div class="html-to-pdf-preview">
      <style>
      .html-to-pdf-overflow {
        overflow: hidden !important;
      }
      .html-to-pdf-preview {
        position: fixed;
        left: 0;
        top: 0;
        z-index: 9998;
        padding: 12px;
        width: 100%;
        height: 100%;
        background-color: #999;
        box-sizing: border-box;
        overflow-y: auto;
      }
      .html-to-pdf-btn {
        position: fixed;
        top: 50px;
        right: 32px;
        padding: 25px 0;
        width: 50px;
        background-color: rgba(0,0,0, 0.4);
        border-radius: 25px;
      }
      .html-to-pdf-btn div {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 50px;
        height: 50px;
        cursor: pointer;
      }
      .html-to-pdf-btn div:hover {
        background-color: #f4f5f6;
      }
      .html-to-pdf-content {
        margin: 0 auto;
        max-width: 800px;
        width: 100%;
      }
      .html-to-pdf-preview img {
        display: block;
        margin-bottom: 12px;
        width: 100%;
      }
      .html-to-pdf-preview img:last-child {
        margin-bottom: 0;
      }
      </style>
      <div class="html-to-pdf-btn">
        <div>
          <svg t="1743664426875" class="html-to-pdf-close" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="11596" width="26" height="26"><path d="M1022.583467 127.803733 894.779733 0 511.291733 383.4624 127.8464 0 0 127.803733 383.496533 511.274667 0 894.737067 127.8464 1022.5408 511.291733 639.0784 894.779733 1022.5408 1022.583467 894.737067 639.138133 511.274667Z" fill="#000" p-id="11597"></path></svg>
        </div>
        <div>
         <svg t="1743664316672" class="html-to-pdf-download" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="10613" width="32" height="32"><path d="M719.203225 337.110448c19.045991 0 31.231329 5.11989 36.504815 15.35967 5.273487 10.23978 1.535967 23.500295-11.110161 39.730346-13.414112 16.946836-28.876179 37.477594-46.539799 61.438679-17.612421 24.063483-35.941627 48.997347-54.987618 74.750393l-55.499607 75.262381c-17.970814 24.421875-33.996069 45.413424-48.126965 63.077044-12.697327 16.28125-24.831466 24.729068-36.453616 25.445853-11.62215 0.716785-24.16588-6.707056-37.528793-22.271521a1710.043234 1710.043234 0 0 1-46.027811-58.827535c-17.254029-22.937107-35.071246-47.000589-53.400452-72.08805-18.329206-25.087461-36.453616-49.662932-54.475628-73.624017-17.919615-24.063483-33.996069-44.901435-48.126966-62.565055-15.462068-19.097189-21.503538-34.968848-17.919614-47.666175 3.481525-12.748526 15.154874-18.738797 34.86645-18.022013 11.980542 0 27.493809-0.358392 46.539799-1.075177 19.045991-0.716785 34.86645-1.023978 47.614977-1.023978 14.079697-0.767983 22.681112-5.11989 25.855444-13.311714 3.174332-8.089426 4.761498-19.250786 4.761497-33.381682V236.402213c0-19.097189-0.153597-38.501572-0.511989-58.315546-0.358392-19.762775-0.511989-39.218357-0.511989-58.315546V66.78026c0-7.065448 0.511989-14.489288 1.535967-22.220322 1.075177-7.782233 3.583923-14.847681 7.423841-21.247543a46.079009 46.079009 0 0 1 16.895636-15.871659c7.42384-4.249509 17.458825-6.348664 30.207351-6.348663 14.745283 0 28.312991-0.204796 40.651926-0.511989A1561.566426 1561.566426 0 0 1 544.768576 0.016896c23.2443 0 38.911163 5.478282 47.051788 16.383647 8.089426 11.007763 12.134139 28.466588 12.134139 52.530071v41.317512c0 16.28125 0.204796 33.586478 0.511989 51.966882 0.358392 18.329206 0.511989 36.709611 0.511989 55.090016v49.816529c0 21.196344 2.150354 37.989583 6.399862 50.379717 4.19831 12.338935 13.721305 18.175609 28.517787 17.458824 10.598172 0 23.449096 0.358392 38.60397 1.023978 15.154874 0.767983 28.722582 1.126376 40.703125 1.126376z m273.658117 559.706366c4.249509 16.895637 3.379127 33.176887-2.611144 48.741352-6.04147 15.564465-15.35967 29.183373-28.056997 40.805523-12.697327 11.673349-28.159395 20.837952-46.5398 27.545008a170.850727 170.850727 0 0 1-59.185927 10.086183H139.529288c-25.394654 0-47.768573-4.607901-67.172956-13.823703-19.404383-9.164603-34.86645-20.47956-46.539799-33.893671a104.445754 104.445754 0 0 1-23.2443-43.979854c-3.891116-15.871659-3.327928-30.207351 1.587166-42.904678 4.249509-9.932586 8.447818-20.172366 12.697327-30.719339a1004.522403 1004.522403 0 0 1 28.517786-66.814564l40.191136-97.533903h120.573408l-45.464622 133.577928h680.945359l-45.413423-133.577928h115.197523l40.242335 97.533903c4.915094 12.697327 9.830189 25.087461 14.796482 37.119202l13.209316 32.306505c3.891116 9.522995 7.065448 17.66362 9.522995 24.370676 2.457547 6.707056 3.686321 10.444575 3.686321 11.16136z" fill="#000000" p-id="10614"></path></svg>
        </div>
      </div>
      <div class="html-to-pdf-content">
        {{ conetent }}
      </div>
    </div>`;
    const pageImages = await this.getPageImages();
    if (pageImages.length === 0) {
      return Promise.reject(new Error("生成PDF失败"));
    }
    let str = "";
    pageImages.forEach((image) => {
      str += `<img src="${image}" alt="PDF 图片" />`;
    });
    const previewBox = document.createElement("div");
    previewBox.innerHTML = html.replace("{{ conetent }}", str);
    document.body.appendChild(previewBox);
    document.body.classList.add("html-to-pdf-overflow");
    const closeIcon = previewBox.querySelector(".html-to-pdf-close");
    const closeEvent = () => {
      closeIcon?.removeEventListener("click", closeEvent);
      document.body.classList.remove("html-to-pdf-overflow");
      document.body.removeChild(previewBox);
    };
    closeIcon?.addEventListener("click", closeEvent);
    const downloadIcon = previewBox.querySelector(".html-to-pdf-download");
    const downloadEvent = async () => {
      downloadIcon?.removeEventListener("click", downloadEvent);
      const tipDiv = this.previewTip();
      document.body.appendChild(tipDiv);
      await delay(500);
      await this.save();
      document.body.removeChild(tipDiv);
      document.body.removeChild(previewBox);
    };
    downloadIcon?.addEventListener("click", downloadEvent);
  }
  async save() {
    const pageImages = await this.getPageImages();
    if (pageImages.length === 0) {
      return Promise.reject(new Error("生成PDF失败"));
    }
    pageImages.forEach((img, idx) => {
      if (idx !== 0) {
        this.jsPdf.addPage();
      }
      this.jsPdf.addImage(img, "JPEG", 0, 0, this.pdfWidth, this.pdfHeight);
    });
    this.jsPdf.save(this.options.name || Date.now() + ".pdf");
  }
}
