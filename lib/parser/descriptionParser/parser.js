module.exports = function descriptionParser(comments) {
  let descriptionContent = '';

  comments.forEach((c) => {
    const commentValue = c.value;
    if (c.type === 'CommentLine' && commentValue && commentValue.startsWith('!')) {
      descriptionContent += commentValue.replace(/^!\s*/, '\n');
    }
  });

  return descriptionContent;
}
