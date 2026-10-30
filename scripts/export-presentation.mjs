import { chromium } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const htmlPath = resolve("apresentacao-comercial.html");
const pdfPath = resolve("apresentacao-comercial.pdf");
const browser = await chromium.launch({ headless: true, channel: "chrome" });

try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load" });
  const slides = await page.locator(".slide").count();
  if (slides !== 13) throw new Error(`Esperados 13 slides; encontrados ${slides}.`);

  const missingImages = await page.locator("img").evaluateAll((images) =>
    images.filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.getAttribute("src")),
  );
  if (missingImages.length) throw new Error(`Imagens ausentes: ${missingImages.join(", ")}`);

  await page.addStyleTag({ content: ".controls,.progress,.print-help{display:none!important}" });
  const images = [];
  for (let index = 0; index < slides; index += 1) {
    await page.evaluate((slideIndex) => show(slideIndex), index);
    images.push((await page.screenshot({ fullPage: false })).toString("base64"));
  }

  const printPage = await browser.newPage();
  await printPage.setContent(`<!doctype html><html><head><style>
    @page{size:16in 9in;margin:0}html,body{margin:0;padding:0}
    img{display:block;width:16in;height:9in;page-break-after:always;break-after:page}
    img:last-child{page-break-after:auto;break-after:auto}
  </style></head><body>${images.map((base64) => `<img src="data:image/png;base64,${base64}">`).join("")}</body></html>`);
  await printPage.pdf({ path: pdfPath, printBackground: true, preferCSSPageSize: true });
  await printPage.close();

  console.log(`PDF gerado: ${pdfPath} (${slides} slides)`);
} finally {
  await browser.close();
}
