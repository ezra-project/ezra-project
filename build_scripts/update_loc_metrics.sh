#!/bin/sh

echo '# Ezra Bible App LOC Metrics' > LOC_METRICS.md
cloc --md --exclude-dir=__tests__ \
          app \
          build_scripts \
          css \
          docker \
          html \
          locales \
          package_config \
          index.html \
          main.js \
          package.json \
          node_modules/node-sword-interface/src \
          node_modules/node-sword-interface/*.md \
          node_modules/node-sword-interface/scripts \
          node_modules/node-sword-interface/*.js \
          node_modules/node-sword-interface/*.json \
          *.md | tail -n +4 >> LOC_METRICS.md

echo "" >> LOC_METRICS.md
echo "The above metrics include both the frontend (mostly JavaScript) \
and the [backend](https://github.com/ezra-project/node-sword-interface) (mostly C++)." >> LOC_METRICS.md

DATE=`date`
echo "" >> LOC_METRICS.md
printf "Generated on ${DATE} using [cloc](https://github.com/AlDanial/cloc)." >> LOC_METRICS.md