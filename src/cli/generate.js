/* eslint-disable no-console */
const fs = require('fs');
const TestCodeGenerator = require('../utility/TestCodeGenerator');

(async () => {
  const generator = new TestCodeGenerator('history.json');
  const code = generator.parse();
  console.log(code);
  fs.writeFileSync('generated/generated.spec.js', code);
})();
