
NAME    := simple-weather
DOMAIN  := romanlefler.github.io
VERSION := $(shell awk '/version-name/{print $$NF}' ./info/metadata.json)

INFO    := ./info
SCHEMAS := ./schemas
SRC     := ./src
DIST    := ./dist
BUILD   := $(DIST)/build
SCHEMAOUTDIR := $(BUILD)/schemas

METADATA   := $(INFO)/metadata.json
SCHEMASRC  := $(SCHEMAS)/org.gnome.shell.extensions.$(NAME).gschema.xml
# This excludes .d.ts files
SRCS       := $(wildcard $(SRC)/*[!.d].ts)

SCHEMAOUT  := $(SCHEMAOUTDIR)/gschemas.compiled
SCHEMACP   := $(SCHEMAOUTDIR)/org.gnome.shell.extensions.$(NAME).gschema.xml
METADATACP := $(BUILD)/metadata.json
JSOUT      := $(patsubst %.js,%.ts,$(SRCS))
ZIP		   := $(DIST)/$(NAME)-v$(VERSION).zip

.PHONY: all pack install clean

all: $(BUILD)/extension.js

pack: $(ZIP)

install:
	rm -rf ~/.local/share/gnome-shell/extensions/$(NAME)@$(DOMAIN)
	mv $(BUILD) ~/.local/share/gnome-shell/extensions/$(NAME)@$(DOMAIN)

clean:
	rm -rf $(DIST)

node_modules: package.json
	printf -- 'NEEDED: npm\n'
	npm install

$(JSOUT): $(SRCS) node_modules
	printf -- 'NEEDED: tsc\n'
	tsc

$(SCHEMAOUT): $(SCHEMASRC)
	printf -- 'NEEDED: glib-compile-schemas\n'
	mkdir -p $(SCHEMAOUTDIR)
	glib-compile-schemas $(SCHEMAS) --targetdir=$(SCHEMAOUTDIR)

$(SCHEMACP): $(SCHEMASRC)
	mkdir -p $(SCHEMAOUTDIR)
	cp $(SCHEMASRC) $(SCHEMACP)

$(METADATACP): $(METADATA)
	mkdir -p $(BUILD)
	cp $(METADATA) $(METADATACP)

$(ZIP): $(JSOUT) $(SCHEMAOUT) $(SCHEMACP) $(METADATACP)
	printf -- 'NEEDED: zip\n'
	mkdir -p $(DIST)
	(cd $(BUILD) && zip ../../$(ZIP) -9r ./)
