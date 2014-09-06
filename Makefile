all: build

run: build
	./server.o

build: clean
	go env
	export GOPATH=/opt/ && go get .
	export GOPATH=/opt/ && go build -o server.o

threaded: build
	GOMAXPROCS=8 ./server.o

clean:
	go clean
	rm -f server.exe server.o
	go fmt
	for i in $(ls -d */); do go fmt legend-of-adventure/${i%%/}; done
