
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
THEMES       := ./themes
AUTHORS	     := ./AUTHORS

STATICSRCS := $(wildcard $(STATIC)/*)
SCHEMASRC  := $(SCHEMAS)/org.gnome.shell.extensions.$(NAME).gschema.xml
# This excludes .d.ts files
SRCS       := $(shell find $(SRC) -type f -name '*.ts' ! -name '*.d.ts')
POFILES	   := $(wildcard $(PO)/*.po)
# This intentionally includes the license file
ICONSSRCS  := $(wildcard $(ICONS)/*)
CSSSRCS    := $(wildcard $(THEMES)/*.css)

SCHEMAOUT    := $(SCHEMAOUTDIR)/gschemas.compiled
SCHEMACP     := $(SCHEMAOUTDIR)/org.gnome.shell.extensions.$(NAME).gschema.xml
STATICOUT    := $(STATICSRCS:$(STATIC)/%=$(BUILD)/%)
ZIP		     := $(DIST)/$(NAME)-v$(VERSION).zip
POT			 := $(PO)/$(UUID).pot
ICONSOUT	 := $(ICONSSRCS:$(ICONS)/%=$(BUILD)/icons/%)
CSSOUT		 := $(BUILD)/stylesheet.css
MOS          := $(POFILES:$(PO)/%.po=$(BUILD)/locale/%/LC_MESSAGES/$(UUID).mo)

# Packages should use make DESTDIR=... for packaging
ifeq ($(strip $(DESTDIR)),)
	INSTALLTYPE = local
	INSTALLBASE = $(HOME)/.local/share/gnome-shell/extensions
else
	INSTALLTYPE = system
	SHARE_PREFIX = $(DESTDIR)/usr/share
	INSTALLBASE = $(SHARE_PREFIX)/gnome-shell/extensions
endif

.PHONY: out pack install clean copyicons ts update-po

out: $(POT) ts $(SCHEMAOUT) $(SCHEMACP) $(STATICOUT) $(ICONSOUT) $(MOS) $(CSSOUT)

pack: $(ZIP)

pot: $(POT)

install: out
	rm -rf ~/.local/share/gnome-shell/extensions/$(UUID)
	mkdir -p ~/.local/share/gnome-shell/extensions
	cp -r $(BUILD) ~/.local/share/gnome-shell/extensions/$(UUID)
ifeq ($(INSTALLTYPE),system)
	rm -rf $(addprefix $(INSTALLBASE)/$(UUID)/, schemas locale LICENSE)
	mkdir -p $(SHARE_PREFIX)/glib-2.0/schemas \
		$(SHARE_PREFIX)/locale \
		$(SHARE_PREFIX)/licenses/$(UUID)
	cp -r $(BUILD)/schemas/*gschema.xml $(SHARE_PREFIX)/glib-2.0/schemas
	cp -r $(BUILD)/locale/* $(SHARE_PREFIX)/locale
	cp -r ./LICENSE $(SHARE_PREFIX)/licenses/$(UUID)
endif

clean:
	rm -rf $(DIST)
	rm -f $(POT)

./node_modules/.package-lock.json: package.json
	printf -- 'NEEDED: npm\n'
	npm install

ts: $(BUILD)/extension.js

# Build files with tsc
# Also inserts "const authors=FILE" into resources.js
$(BUILD)/extension.js $(BUILD)/resource.js: $(SRCS) $(AUTHORS) ./node_modules/.package-lock.json
	printf -- 'NEEDED: tsc\n'
	tsc
	@touch $(BUILD)/extension.js

	@if ! grep -q '// Inserted' $(BUILD)/resource.js; then \
		printf '// Inserted\n\nconst authors = `' >> $(BUILD)/resource.js; \
		cat $(AUTHORS) >> $(BUILD)/resource.js; \
		printf '`;' >> $(BUILD)/resource.js; \
	else \
		touch $(BUILD)/resource.js; \
	fi

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

$(BUILD)/icons/%: $(ICONS)/% | $(BUILD)/icons
	cp $< $@

# Explicitly putting stylesheet.css here makes it
# first in the outputted file
$(CSSOUT): $(THEMES)/stylesheet.css $(CSSSRCS)
	cat $^ > $@

$(ZIP): out
	printf -- 'NEEDED: zip\n'
	mkdir -p $(DIST)
	(cd $(BUILD) && zip ../../$(ZIP) -9r ./)
	
# Updates all existing po files by merging them with the pot.
# If already present, the pot is removed and recreated.
update-po:
	rm -f $(POT); \
	$(MAKE) pot
	@printf -- 'NEEDED: gettext\n'
	@if [ -n "$$(ls -A $(PO)/*.po 2>/dev/null)" ]; then \
		for f in $(POFILES); do \
			printf -- 'Merging %s with $(POT) ' "$$f"; \
			msgmerge --no-fuzzy-matching --update --backup=none $$f $(POT); \
		done; \
	else \
		printf -- 'Unsuccessful PO update: there are no PO files\n'; \
	fi
