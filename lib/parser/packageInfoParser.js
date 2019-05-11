const fs = require('fs');

function packageInfoParser(workpath) {
  const packageInfo = {
    name: 'unknown',
    author: 'unknown',
    github: 'unknown',
  };
  const packageJsonPath = `${workpath}/package.json`;

  if (fs.existsSync(packageJsonPath)) {
    const packageJsonData = require(packageJsonPath);
    packageInfo.name = packageJsonData.name;
    packageInfo.author = packageJsonData.author;
    packageInfo.github = packageJsonData.github;
  }

  return packageInfo;
}

module.exports = packageInfoParser;