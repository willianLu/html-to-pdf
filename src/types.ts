import { type jsPDFOptions } from "jspdf";
import { type Options as Html2canvasOptions } from "html2canvas";
import JsPdf from "jspdf";

// 定义HtmlToPdf类接口
export interface HtmlToPdfClass {
  $el: HTMLElement;
  jsPdf: JsPdf;
  pdfWidth: number;
  pdfHeight: number;
  options: PdfOptions;
  plugins: PluginWrap<any>[];
  createVirtualWrap(element: Node | Element, width: number): HTMLDivElement;
  createCanvas(width: number, height: number): HTMLCanvasElement;
  loadImage(url: string): Promise<HTMLImageElement>;
  waitForImagesLoaded(element: Element): Promise<void | unknown[]>;
  resetBaseStyle(element: Element): void;
  getPageImages(): Promise<string[]>;
  addPageImage(image: string): void;
  preview(): void;
  save(): Promise<void>;
  use<T>(plugin: PdfPlugin<T>, pluginOptions?: T): void;
}

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

// 页眉页脚参数
export interface HeaderOrFooterOptions {
  image?: string;
  imageWidth?: number;
  imageHeight?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  align?: "left" | "center" | "right";
  color?: string;
}

// 导出PDF参数
export interface PdfOptions {
  // 文件名
  name?: string;
  // 整体块的class名称，生成pdf时作为整体处理，不会被分页切割
  monoblockClassName?: string | string[];
  // 分页的class名称，将该元素当成一整页pdf处理
  pageBreakClassName?: string | string[];
  // PDF背景色
  backgroundColor?: string;
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
  // 页眉插件参数
  header?: HeaderOrFooterOptions;
  // 页脚插件参数
  footer?: HeaderOrFooterOptions;
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
  // canvas 与 pdf 尺寸 - 转化宽度比
  widthRatio: number;
  // 绘制 canvas(整个html生成的canvas) 的 y 轴坐标
  y: number;
  // 单页 canvas 尺寸的大小
  canvasWidth: number;
  canvasHeight: number;
  // 单页绘制 canvas 内容的尺寸
  contentWidth: number;
  contentHeight: number;
  // 当前页码
  page: number;
  // 总页码
  totalPage: number;
}

export interface PdfPlugin<T> {
  beforeDraw?: (
    app: HtmlToPdfClass,
    singlePageOptions: SinglePageOptions,
    pluginOptions?: T
  ) => Promise<void> | void;
  draw?: (
    app: HtmlToPdfClass,
    ctx: CanvasRenderingContext2D,
    singlePageOptions: SinglePageOptions,
    pluginOptions?: T
  ) => Promise<void> | void;
  afterDraw?: (
    app: HtmlToPdfClass,
    singlePageOptions: SinglePageOptions,
    pluginOptions?: T
  ) => Promise<void> | void;
}

export interface PluginWrap<T> {
  plugin: PdfPlugin<T>;
  pluginOptions?: T;
}
