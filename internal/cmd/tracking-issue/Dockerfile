FROM golang:1.17-alpine AS builder

WORKDIR /go/src/tracking-issue
COPY . .
RUN go mod init tracking-issue
RUN go get ./...
RUN CGO_ENABLED=0 go install .

FROM sourcegraph/alpine-3.12:120059_2021-12-09_b34c7b2@sha256:9a1fde12f56fea02027cf4caeebdddfedb7b73bf8db6c16f7907a6e04a29134c
COPY --from=builder /go/bin/* /usr/local/bin/
ENTRYPOINT ["tracking-issue"]
