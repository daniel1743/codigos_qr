const fs = require('fs');
let file1 = 'src/components/qr/QRCodeAdvanced.tsx';
let file2 = 'src/lib/qr-advanced-utils.ts';

if (fs.existsSync(file1)) {
  let code1 = fs.readFileSync(file1, 'utf8');
  code1 = code1.replace(/URL\.createObjectURL\((.*?)\)/g, (match, p1) => {
    return `URL.createObjectURL(${p1} as Blob)`;
  });
  fs.writeFileSync(file1, code1);
  console.log("Fixed QRCodeAdvanced.tsx");
}

if (fs.existsSync(file2)) {
  let code2 = fs.readFileSync(file2, 'utf8');
  // It says image: string | undefined is not assignable to string.
  // The error was on line 114 in qr-advanced-utils.ts.
  code2 = code2.replace(/image: logoUrl/g, '...(logoUrl ? { image: logoUrl } : {})');
  code2 = code2.replace(/image: opts\.logoUrl/g, '...(opts.logoUrl ? { image: opts.logoUrl } : {})');
  fs.writeFileSync(file2, code2);
  console.log("Fixed qr-advanced-utils.ts");
}
