#!/usr/bin/env bash

# shellcheck disable=SC1091
source /root/.profile
root_dir="$(dirname "${BASH_SOURCE[0]}")/../../../.."
cd "$root_dir"
root_dir=$(pwd)

set -ex

dev/ci/test/setup-deps.sh
dev/ci/test/setup-display.sh

cleanup() {
  cd "$root_dir"
  dev/ci/test/cleanup-display.sh
  if [[ $(docker ps -aq | wc -l) -gt 0 ]]; then
    docker rm -f "$(docker ps -aq)"
  fi
  docker rmi -f "$(docker images -q)"
}
trap cleanup EXIT

# ==========================

echo "TEST: Running E2E tests"
if [[ $VAGRANT_RUN_ENV = "CI" ]]; then
  IMAGE=us.gcr.io/sourcegraph-dev/server:$CANDIDATE_VERSION
else
  # shellcheck disable=SC2034
  IMAGE=sourcegraph/server:insiders
fi

./dev/ci/e2e.sh
