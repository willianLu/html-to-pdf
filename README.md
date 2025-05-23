# html-to-pdf 使用说明

> 本库致力于 html 在线导出为 pdf，实现智能分页效果，不会切断文本图片表格等内容，可兼容手机端。本库依赖 html2canvas 和 jspdf，使用 canvas 绘图，请保证使用浏览器对以上库是支持的。

[html-to-pdf 示例](https://willianlu.github.io/html-pdf-docs/#/demo)

[html-to-pdf 示例源码地址](https://github.com/willianLu/html-pdf-docs)

## 问题说明
> 目前经大量测试，分页切断文字图片等内容的情况，都是html2canvas库在转化图片时，原Element元素的样式不一致，后续会针对该情况做深入分析。
> 由于该库先对整个html进行图片转换，对大型的报告输出可能存在潜在问题，后续也会对核心算法进行优化。
> 目前个人精力有限，寻找愿意维护该库的同志，共同打造该项目。

## 联系方式
> 欢迎大家来交流沟通
> QQ: 1013658157   QQ群: 1020635380

## 安装

```bash
# 使用npm
npm i -S @wk-tools/html-to-pdf
# 使用yarn
yarn add @wk-tools/html-to-pdf
```

## 用法

```ts
// ...
import HtmlToPdf from "@wk-tools/html-to-pdf";

function exportPDF() {
  Loading.show();
  const element = document.getElementById("pdf-container");
  const htmlToPdf = new HtmlToPdf(element, {
    name: "葵花宝典",
  });
  htmlToPdf
    .save()
    .catch(() => {
      Message.error("下载失败");
    })
    .finally(() => {
      Loading.hide();
    });
}
```

## 类/属性/方法/参数等说明

### HtmlToPdfClass

| 属性                | 类型                                                        | 说明                                             |
| ------------------- | ----------------------------------------------------------- | ------------------------------------------------ |
| $el                 | HTMLElement                                                 | PDF DOM 元素                                     |
| jsPdf               | JsPdf                                                       | JsPdf 实例                                       |
| pdfWidth            | number                                                      | PDF 单页宽度                                     |
| pdfHeight           | number                                                      | PDF 单页高度                                     |
| options             | PdfOptions                                                  | PDF 配置                                         |
| plugins             | PluginWrap                                                  | 插件列表                                         |
| createVirtualWrap   | (element: Node \| Element, width: number) => HTMLDivElement | 创建虚拟 DOM，并设定宽度                         |
| createCanvas        | (width: number, height: number) => HTMLCanvasElement        | 创建 虚拟 canvas 元素                            |
| loadImage           | (url: string) => Promise                                    | 加载图片，并返回 image 元素                      |
| waitForImagesLoaded | (element: Element) => Promise                               | 等待图片加载完成，并针对图片设置通用样式         |
| resetBaseStyle      | (element: Element) => void                                  | 重置元素样式，默认针对 h1-h6 的 margin 样式设置  |
| getPageImages       | Promise                                                     | 获取生成 PDF 的页面图片                          |
| addPageImage        | (image: string) => void                                     | 将图片加入 PDF 页面管理中，将会作为 PDF 页面导出 |
| preview             | () => void                                                  | 预览生成的 PDF 内容                              |
| save                | () => Promise                                               | 生成 PDF                                         |
| use                 | user(plugin: PdfPlugin, pluginOptions?: T) => void          | 注册插件                                         |

> 注意：resetBaseStyle 与 waitForImagesLoaded 包含的重制样式，是因为 html2canvas 在导出图片时，某些样式会与 DOM 元素不一致，故要增加特定样式以达到所见即所得。若是遇到页面所见与导出不一致，请着重思考样式问题。

### PdfOptions

| 参数               | 类型                            | 必填项 | 默认                                                                          | 说明                                                                           |
| ------------------ | ------------------------------- | ------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| name               | string                          | 否     | --                                                                            | 导出文件名称                                                                   |
| monoblockClassName | string \| string[]              | 否     | 'html-pdf-monoblock'                                                          | 分页处理时，将元素内容当作一个整体                                             |
| pageBreakClassName | string \| string[]              | 否     | 'html-pdf-page-break'                                                         | 分页的class名称，将该元素当成一整页pdf处理                                          |
| backgroundColor    | string                          | 否     | #fff                                                                          | PDF 背景颜色                                                                   |
| scale              | number                          | 否     | 2                                                                             | 导出内容放大倍数，增加内容清晰度，必须大于 0                                   |
| margin             | number \| number[]              | 否     | 10                                                                            | PDF 内容边距                                                                   |
| ignoreElement      | (element: Element) => Element[] | 否     | --                                                                            | 分页计算忽略的元素                                                             |
| resetStyleTags     | string[]                        | 否     | --                                                                            | 需要重置样式的标签，目前只发现 h1-h6 标签在 html2canvas 中默认增加了 margin 值 |
| header             | HeaderOrFooterOptions           | 否     | --                                                                            | 页眉参数                                                                       |
| footer             | HeaderOrFooterOptions           | 否     | --                                                                            | 页脚参数                                                                       |
| adaptive           | boolean                         | 否     | true                                                                          | 是否开启自适应，开启自适应会根据设置宽度导出 PDF                               |
| adaptiveOptions    | AdaptiveOptions                 | 否     | --                                                                            | 自适应导出 PDF 配置                                                            |
| jsPDFOptions       | jsPDFOptions                    | 否     | { unit: "px", format: "a4" }                                                  | jsPDF 插件配置，单位仅支持 px                                                  |
| html2CanvasOptions | html2CanvasOptions              | 否     | { scale: PdfOptions.scale ,logging: false,useCORS: true,width: element.width} | html2canvas 插件配置                                                           |

### HeaderOrFooterOptions

| 参数        | 类型                          | 必填项 | 默认 | 说明                 |
| ----------- | ----------------------------- | ------ | ---- | -------------------- |
| image       | string                        | 否     | --   | 页眉页脚图片地址     |
| imageWidth  | number                        | 否     | --   | 页眉页脚图片绘制宽度 |
| imageHeight | number                        | 否     | --   | 页眉页脚图片绘制高度 |
| text        | string                        | 否     | --   | 页眉页脚文案内容     |
| fontSize    | number                        | 否     | --   | 页眉页脚文案字体大小 |
| fontFamily  | string                        | 否     | --   | 页眉页脚文案字体     |
| align       | "left" \| "center" \| "right" | 否     | --   | 页眉页脚文案对齐方式 |
| color       | string                        | 否     | --   | 页眉页脚文案颜色     |

### AdaptiveOptions

| 参数           | 类型                       | 必填项 | 默认          | 说明                                                             |
| -------------- | -------------------------- | ------ | ------------- | ---------------------------------------------------------------- |
| pdfWidth       | number                     | 否     | 800           | 按此宽度绘制导出 PDF 内容                                        |
| parentElement  | HTMLElement                | 否     | document.body | 自适应创建元素挂载节点，必要时可以规避一些样式问题               |
| resetView      | (element: Element) => void | 否     | --            | 自适应模式下，是克隆的元素，导致 canvas 无法展示，对内容重新绘制 |
| resetViewDelay | number                     | 否     | 1000          | 图表重绘后，延迟处理导出，给图表绘制预留充足的时间               |

### PdfPlugin

> 为了方便扩展基础功能，PDF 生成增加了插件机制。插件有 beforeDraw、draw、afterDraw 三个钩子，通过钩子可以增加 PDF 页面，或者在 PDF 页面中增加自定义内容（页眉页脚）。本工具内置了页眉页脚插件，并开放了封面、封底插件，用于用户参考使用。若是有目录或水印需求，可通过插件实现。

| 方法       | 类型     | 说明                                             |
| ---------- | -------- | ------------------------------------------------ |
| beforeDraw | Function | PDF 绘制前的钩子，可用于封面的绘制               |
| draw       | Function | PDF 单页面绘制的钩子，可用于绘制水印等自定义内容 |
| afterDraw  | Function | PDF 绘制后的钩子，可用于绘制封底                 |

### SinglePageOptions

| 参数          | 类型       | 必填项 | 默认 | 说明                                   |
| ------------- | ---------- | ------ | ---- | -------------------------------------- |
| pageMargin    | PageMargin | 是     | --   | PDF 绘制的边距(上下左右)               |
| widthRatio    | number     | 是     | --   | 绘制的 canvas 与 pdf 尺寸 - 转化宽度比 |
| y             | number     | 是     | --   | 绘制 canvase 的 y 轴坐标               |
| canvasWidth   | number     | 是     | --   | 单页 canvas 的宽度                     |
| canvasHeight  | number     | 是     | --   | 单页 canvas 的高度                     |
| contentWidth  | number     | 是     | --   | 单页内容的宽度，去除左右边距           |
| contentHeight | number     | 是     | --   | 单页内容的高度，去除上下边距           |
| page          | number     | 是     | --   | 当前页码                               |
| totalPage     | number     | 是     | --   | 总页码                                 |

## 封面/底插件

### CoverPluginOptions

| 参数      | 类型         | 必填项 | 默认 | 说明     |
| --------- | ------------ | ------ | ---- | -------- |
| cover     | CoverOptions | 否     | --   | 封面参数 |
| backcover | CoverOptions | 否     | --   | 封底参数 |

### CoverOptions

| 参数            | 类型                                     | 必填项 | 默认       | 说明                           |
| --------------- | ---------------------------------------- | ------ | ---------- | ------------------------------ |
| backgroundColor | string                                   | 否     | #fff       | 背景颜色                       |
| image           | string                                   | 否     | --         | 背景图片                       |
| fit             | "fill" \| "contain" \| "cover" \| "none" | 否     | --         | 图片填充方式                   |
| text            | string                                   | 否     | --         | 封面/底 文案内容               |
| fontSize        | number                                   | 否     | 32         | 文案字体大小                   |
| fontWeight      | string \| number                         | 否     | 'bold'     | 文案字体粗细                   |
| fontFamily      | string                                   | 否     | "微软雅黑" | 文案字体                       |
| color           | string                                   | 否     | --         | 文案颜色                       |
| element         | HTMLElement                              | 否     | --         | 封面/底 DOM 元素，将转化成图片 |
| elementFit      | "fill" \| "contain" \| "cover" \| "none" | 否     | --         | 封面/底 DOM 元素填充方式       |

## License

MIT
