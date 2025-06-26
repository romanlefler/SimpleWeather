
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
ICONS        := ./icons

STATICSRCS := $(wildcard $(STATIC)/*)
SCHEMASRC  := $(SCHEMAS)/org.gnome.shell.extensions.$(NAME).gschema.xml
# This excludes .d.ts files
SRCS       := $(shell find $(SRC) -type f -name '*.ts' ! -name '*.d.ts')
POFILES	   := $(wildcard $(PO)/*.po)
# This intentionally includes the license file
ICONSSRCS  := $(wildcard $(ICONS)/*)

SCHEMAOUT    := $(SCHEMAOUTDIR)/gschemas.compiled
SCHEMACP     := $(SCHEMAOUTDIR)/org.gnome.shell.extensions.$(NAME).gschema.xml
STATICOUT    := $(STATICSRCS:$(STATIC)/%=$(BUILD)/%)
ZIP		     := $(DIST)/$(NAME)-v$(VERSION).zip
POT			 := $(PO)/$(UUID).pot
ICONSOUT	 := $(ICONSSRCS:$(ICONS)/%=$(BUILD)/icons/%)
MOS          := $(POFILES:$(PO)/%.po=$(BUILD)/locale/%/LC_MESSAGES/$(UUID).mo)

.PHONY: out pack install clean copyicons ts

out: $(POT) ts $(SCHEMAOUT) $(SCHEMACP) $(STATICOUT) $(ICONSOUT) $(MOS)

pack: $(ZIP)

pot: $(POT)

install: out
	rm -rf ~/.local/share/gnome-shell/extensions/$(UUID)
	mkdir -p ~/.local/share/gnome-shell/extensions
	cp -r $(BUILD) ~/.local/share/gnome-shell/extensions/$(UUID)

clean:
	rm -rf $(DIST)
	rm -f $(POT)

./node_modules/.package-lock.json: package.json
	printf -- 'NEEDED: npm\n'
	npm install

ts: $(BUILD)/extension.js

$(BUILD)/extension.js: $(SRCS) ./node_modules/.package-lock.json
	printf -- 'NEEDED: tsc\n'
	tsc

$(SCHEMAOUT): $(SCHEMASRC)
	printf -- 'NEEDED: glib-compile-schemas\n'
	mkdir -p $(SCHEMAOUTDIR)
	glib-compile-schemas $(SCHEMAS) --targetdir=$(SCHEMAOUTDIR) --strict

$(SCHEMACP): $(SCHEMASRC)
	mkdir -p $(SCHEMAOUTDIR)
	cp $(SCHEMASRC) $(SCHEMACP)

$(STATICOUT): $(BUILD)/%: $(STATIC)/%
	mkdir -p $(BUILD)
	cp $< $@

$(POT): $(SRCS)
	printf -- 'NEEDED: xgettext\n'
	mkdir -p $(PO)
	xgettext --from-code=UTF-8 -o $(POT) -k_g -k_p -F \
		-L JavaScript --copyright-holder='Roman Lefler' \
		--package-name=$(UUID) --package-version=$(VERSION) \
		--msgid-bugs-address=simpleweather-gnome@proton.me \
		$(SRCS)

$(BUILD)/locale/%/LC_MESSAGES/$(UUID).mo: $(PO)/%.po
	mkdir -p $(BUILD)/locale/$*/LC_MESSAGES
	msgfmt -c $< -o $@

$(BUILD)/icons:
	mkdir -p $@

$(BUILD)/icons/%: $(ICONS)/% $(BUILD)/icons
	cp $< $@

$(ZIP): out
	printf -- 'NEEDED: zip\n'
	mkdir -p $(DIST)
	(cd $(BUILD) && zip ../../$(ZIP) -9r ./)
