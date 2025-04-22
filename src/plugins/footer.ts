import { type PdfPlugin, type HeaderOrFooterOptions } from "../types";
import { handleHeaderOrFooterText, handleHeaderOrFooterImage } from "../utils";

const FooterPlugin: PdfPlugin<HeaderOrFooterOptions> = {
  async draw(htmlPdf, ctx, pageOptions, options) {
    options = options || {};
    if (options.text) {
      handleHeaderOrFooterText(ctx, pageOptions, options, "footer");
    } else if (options.image) {
      const imgRect = await htmlPdf.loadImage(options.image).catch(() => null);
      if (imgRect) {
        handleHeaderOrFooterImage(ctx, pageOptions, options, imgRect, "footer");
      }
    }
  },
};

export default FooterPlugin;
