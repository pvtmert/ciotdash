
all:
	rsync -ru "188.166.13.50:/srv/$$(basename $$PWD)/store.db" ./
	export PNAME="$$(basename $$PWD)"; cd ..; rsync -ru "$$PNAME" 188.166.13.50:/srv; ssh 188.166.13.50 -- killall node; cd "$$PNAME"
