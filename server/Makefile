run: build
	./server

build: clean
	go env
	export GOPATH=/opt/ && go get .
	go build

clean:
	go clean
	rm -f server.exe server
	go fmt
