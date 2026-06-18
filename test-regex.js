const text = "Indian Union Driving Licence Issued by Government of Tamil Nadu TN77 20230003851 Issue Date Validity (NT) Validity (TR) 26-09-2023 11-02-2043";
console.log("text:", text);
console.log("dlMatch:", text.match(/\b[A-Z]{2}[0-9]{2}[\s-]?[0-9]{11}\b/i));
console.log("dateMatches:", text.match(/\b\d{2}[\/\-]\d{2}[\/\-]\d{4}\b/g));
console.log("validTillMatch:", text.match(/(?:valid till|expiry|validity)(?:[\s:]*(?:\([A-Z]{2}\))?[\s:]*)?(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i));
