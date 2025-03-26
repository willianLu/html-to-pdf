# ai-html-to-pdf

本库致力于 html 在线导出为 pdf，实现智能分页效果，不会切断文本图片表格等内容，可兼容手机端。本库依赖 html2canvas 和 jspdf，使用 canvas 绘图，请保证使用浏览器对以上库是支持的。

### 安装

```bash
# 使用npm
npm i -S ai-html-to-pdf
# 使用yarn
yarn add ai-html-to-pdf
```

### 用法

```ts
// ...
import htmlToPdf from "ai-html-to-pdf";

function exportPDF() {
  Loading.show();
  const element = document.getElementById("pdf-container");
  htmlToPdf
    .exportPDF(element, {
      name: "葵花宝典",
    })
    .finally(() => {
      Loading.hide();
    });
}
```

### 方法

使用规则：htmlToPdf(element, PdfOptions)

- element 要导出的 dom 元素
- PdfOptions 通过设置配置，来达到更理想的效果

### PdfOptions

| 参数               | 类型                            | 必填项                   | 默认                                                                           | 说明                                         |
| ------------------ | ------------------------------- | ------------------------ | ------------------------------------------------------------------------------ | -------------------------------------------- |
| name               | string                          | 否                       | --                                                                             | 导出文件名称                                 |
| monoblockClassName | string \| string[]              | 否                       | 'html-pdf-monoblock'                                                           | 分页处理时，将元素内容当作一个整体           |
| scale              | number                          | 否                       | 2                                                                              | 导出内容放大倍数，增加内容清晰度，必须大于 0 |
| margin             | number \| number[]              | 否                       | 10                                                                             | PDF 内容边距                                 |
| ignoreElement      | (element: Element) => Element[] | 否 ｜ 分页计算忽略的元素 |
| resetStyleTags     | string[]                        | 否                       | 需要重置样式的标签，目前只发现 h1-h6 标签在 html2canvas 中默认增加了 margin 值 |
| header             | string                          | 否                       | --                                                                             | 页眉文案                                     |
| headerAlign        | 'center' \| 'left' \| 'right'   | 'left'                   | 页眉对齐方式                                                                   |
| footer             | string                          | 否                       | --                                                                             | 页脚文案                                     |
| footerAlign        | 'center' \| 'left' \| 'right'   | 'right'                  | 页脚对齐方式                                                                   |
| adaptive           | boolean                         | true                     | 是否开启自适应，开启自适应会根据设置宽度导出 PDF                               |
| adaptiveOptions    | AdaptiveOptions                 | 否                       | --                                                                             | 自适应导出 PDF 配置                          |
| jsPDFOptions       | jsPDFOptions                    | 否                       | { unit: "px", format: "a4" }                                                   | jsPDF 插件配置                               |
| html2CanvasOptions | html2CanvasOptions              | 否                       | { scale: PdfOptions.scale ,logging: false,useCORS: true,width: element.width}  | html2canvas 插件配置                         |

### AdaptiveOptions

| 参数           | 类型                       | 必填项 | 默认          | 说明                                                             |
| -------------- | -------------------------- | ------ | ------------- | ---------------------------------------------------------------- |
| pdfWidth       | number                     | 否     | 800           | 按此宽度绘制导出 PDF 内容                                        |
| parentElement  | HTMLElement                | 否     | document.body | 自适应创建元素挂载节点，必要时可以规避一些样式问题               |
|                |
| resetView      | (element: Element) => void | 否     | --            | 自适应模式下，是克隆的元素，导致 canvas 无法展示，对内容重新绘制 |
| resetViewDelay | number                     | 否     | 1000          | 图表重绘后，延迟处理导出，给图表绘制预留充足的时间               |

## License

MIT
