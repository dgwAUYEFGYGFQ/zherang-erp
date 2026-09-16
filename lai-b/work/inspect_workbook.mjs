import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = "/Users/leoleo/Documents/工作文档/采购云相关汇总/ERP再造-采购云改动/折让改造/正泰新能ERP再造项目_FICO146_采购折让计提数据同步接口.xlsx";
const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);

const overview = await workbook.inspect({
  kind: "workbook,sheet,table,region",
  maxChars: 20000,
  tableMaxRows: 20,
  tableMaxCols: 20,
  tableMaxCellChars: 160,
});
console.log(overview.ndjson);

for (const sheet of workbook.worksheets.items) {
  const used = sheet.getUsedRange();
  const address = used?.address ?? null;
  console.log(JSON.stringify({ type: "sheet-used-range", sheet: sheet.name, address }));
  if (address) {
    const detail = await workbook.inspect({
      kind: "table",
      sheetId: sheet.name,
      range: address,
      include: "values,formulas",
      maxChars: 50000,
      tableMaxRows: 120,
      tableMaxCols: 30,
      tableMaxCellChars: 300,
    });
    console.log(detail.ndjson);
  }
}
