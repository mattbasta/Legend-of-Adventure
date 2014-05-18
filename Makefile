all:
	export GOPATH=`pwd`/vendor && cd server && make
