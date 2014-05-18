run: build
	./server

build: clean
	go env
	go get .
	go build

clean:
	go clean
	rm -f server.exe server
	go fmt
