DEPLOY=/srv/http/agora-core-view/

install:
	npm install
	bower install
	test -e avConfig.js || cp bower_components/avCommon/avConfig.js avConfig.js

build:
	grunt build

serve:
	grunt serve

deploy: build
	rsync -avz --delete dist/ ${DEPLOY}


all: build
	echo "OK"
