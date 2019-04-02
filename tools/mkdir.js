const fs = require('fs');
const path = require('path');

// 递归创建目录 异步方法
module.exports = function mkdirs(dirname, callback) {
  fs.exists(dirname, (exists) => {
    if (exists) {
      callback();
    } else {
      mkdirs(path.dirname(dirname), () => {
        fs.mkdir(dirname, callback);
      });
    }
  });
}
