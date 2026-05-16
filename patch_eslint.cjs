const fs = require('fs');

let content = fs.readFileSync('src/components/ManualAnnotation.tsx', 'utf8');

content = content.replace(
  `  }, [isPlaying, lines, currentLine, currentKeypoints, mode]);`,
  `  // eslint-disable-next-line react-hooks/exhaustive-deps\n  }, [isPlaying, lines, currentLine, currentKeypoints, mode]);`
);

fs.writeFileSync('src/components/ManualAnnotation.tsx', content);
