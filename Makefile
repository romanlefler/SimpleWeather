
NAME    := simple-weather
UUID  := $(shell awk -F'"' '/uuid/ { print $$4 }' ./static/metadata.json)
VERSION := $(shell awk -F'"' '/version-name/ { print $$4 }' ./static/metadata.json)

STATIC       := ./static
SCHEMAS      := ./schemas
SRC          := ./src
DIST         := ./dist
BUILD        := $(DIST)/build
SCHEMAOUTDIR := $(BUILD)/schemas
PO			 := ./po

METADATA   := $(STATIC)/metadata.json
STYLESHEET := $(STATIC)/stylesheet.css
SCHEMASRC  := $(SCHEMAS)/org.gnome.shell.extensions.$(NAME).gschema.xml
# This excludes .d.ts files
SRCS       := $(shell find $(SRC) -type f -name '*.ts' ! -name '*.d.ts')
POFILES	   := $(wildcard $(PO)/*.po)

SCHEMAOUT    := $(SCHEMAOUTDIR)/gschemas.compiled
SCHEMACP     := $(SCHEMAOUTDIR)/org.gnome.shell.extensions.$(NAME).gschema.xml
METADATACP   := $(BUILD)/metadata.json
STYLESHEETCP := $(BUILD)/stylesheet.css
JSOUT        := $(SRCS:$(SRC)/%.ts=$(BUILD)/%.js)
ZIP		     := $(DIST)/$(NAME)-v$(VERSION).zip
POT			 := $(PO)/$(UUID).pot

.PHONY: out pack install clean

out: $(POT) $(JSOUT) $(SCHEMAOUT) $(SCHEMACP) $(METADATACP) $(STYLESHEETCP) copypo

pack: $(ZIP)

pot: $(POT)

install: out
	rm -rf ~/.local/share/gnome-shell/extensions/$(UUID)
	mkdir -p ~/.local/share/gnome-shell/extensions
	cp -r $(BUILD) ~/.local/share/gnome-shell/extensions/$(UUID)

clean:
	rm -rf $(DIST)
	rm $(POT)

node_modules: package.json
	printf -- 'NEEDED: npm\n'
	npm install

$(BUILD)/%.js: $(SRC)/%.ts node_modules
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

$(STYLESHEETCP): $(STYLESHEET)
	mkdir -p $(BUILD)
	cp $(STYLESHEET) $(STYLESHEETCP)

$(POT): $(SRCS)
	printf -- 'NEEDED: xgettext\n'
	mkdir -p $(PO)
	xgettext --from-code=UTF-8 -o $(POT) -k_g -k_p -F \
		-L TypeScript --copyright-holder='Roman Lefler' \
		--package-name=$(UUID) --package-version=$(VERSION) \
		--msgid-bugs-address=simpleweather-gnome@proton.me \
		$(SRCS)

copypo: $(POFILES)
	cp -r $(PO) $(BUILD)/po

$(ZIP): out
	printf -- 'NEEDED: zip\n'
	mkdir -p $(DIST)
	(cd $(BUILD) && zip ../../$(ZIP) -9r ./)
