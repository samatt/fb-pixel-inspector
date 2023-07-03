import { createObjectCsvWriter } from "csv-writer";

export async function writeCSV(path, data, headers) {
  const csvWriter = createObjectCsvWriter({
    path: path,
    header: headers,
  });
  await csvWriter.writeRecords(data); // returns a promise
  // .then(() => {
  //   console.log("...Done");
  // });
}
