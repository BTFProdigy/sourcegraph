package main

import (
	"context"
	"fmt"
	"time"

	"github.com/buildkite/go-buildkite/v3/buildkite"
	"github.com/google/go-github/v41/github"
)

type sherrifOptions struct {
	Branch branchLocker

	FailuresThreshold int
	BuildTimeout      time.Duration
}

func buildsherrif(ctx context.Context, ghc *github.Client, builds []buildkite.Build, opts sherrifOptions) error {
	// Scan for first build with a meaningful state
	var firstFailedBuild int
	for i, b := range builds {
		if b.State != nil && *b.State == "passed" {
			fmt.Printf("most recent finished build %d passed\n", *b.Number)
			if err := opts.Branch.Unlock(ctx); err != nil {
				return fmt.Errorf("unlockBranch: %w", err)
			}
			return nil
		}
		if isBuildFailed(b, opts.BuildTimeout) {
			fmt.Printf("most recent finished build %d failed\n", *b.Number)
			firstFailedBuild = i
			break
		}

		// Otherwise, keep looking for builds
	}

	// if failed, check if failures are consecutive
	failedCommits, exceeded := checkConsecutiveFailures(
		// Check builds after the failed one we found
		builds[firstFailedBuild:],
		// We already have 1 failed build, so we need to find n-1 more
		opts.FailuresThreshold-1,
		opts.BuildTimeout)
	if !exceeded {
		fmt.Println("threshold not exceeded")
		if err := opts.Branch.Unlock(ctx); err != nil {
			return fmt.Errorf("unlockBranch: %w", err)
		}
		return nil
	}

	fmt.Println("threshold exceeded, this is a big deal!")
	if err := opts.Branch.Lock(ctx, failedCommits, []string{"dev-experience"}); err != nil {
		return fmt.Errorf("lockBranch: %w", err)
	}

	return nil
}

func isBuildFailed(build buildkite.Build, timeout time.Duration) bool {
	// Has state and is failed
	if build.State != nil && *build.State == "failed" {
		return true
	}
	// Created, but not done
	if build.CreatedAt != nil && build.FinishedAt == nil {
		return time.Now().After(build.CreatedAt.Add(timeout))
	}
	return false
}

func checkConsecutiveFailures(builds []buildkite.Build, threshold int, timeout time.Duration) (failedCommits []string, thresholdExceeded bool) {
	failedCommits = []string{}

	var consecutiveFailures int
	for _, b := range builds {
		if !isBuildFailed(b, timeout) {
			fmt.Printf("build %d not failed: %+v\n", *b.Number, b)
			return
		}

		consecutiveFailures += 1
		failedCommits = append(failedCommits, *b.Commit)
		fmt.Printf("build %d is %dth consecutive failure\n", *b.Number, consecutiveFailures)
		if consecutiveFailures >= threshold {
			return failedCommits, true
		}
	}

	return
}
