package main

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/buildkite/go-buildkite/v3/buildkite"
)

type sherrifOptions struct {
	FailuresThreshold int
	BuildTimeout      time.Duration
}

type commitInfo struct {
	Commit string
	Author string
}

type sherrifResults struct {
	Locked        bool
	LockModified  bool
	FailedCommits []commitInfo
}

func buildsherrif(ctx context.Context, branch branchLocker, builds []buildkite.Build, opts sherrifOptions) (results *sherrifResults, err error) {
	results = &sherrifResults{}

	// Scan for first build with a meaningful state
	var firstFailedBuild int
	for i, b := range builds {
		if isBuildPassed(b) {
			fmt.Printf("most recent finished build %d passed\n", *b.Number)
			results.LockModified, err = branch.Unlock(ctx)
			if err != nil {
				return nil, fmt.Errorf("unlockBranch: %w", err)
			}
			return
		}
		if isBuildFailed(b, opts.BuildTimeout) {
			fmt.Printf("most recent finished build %d failed\n", *b.Number)
			firstFailedBuild = i
			break
		}

		// Otherwise, keep looking for builds
	}

	// if failed, check if failures are consecutive
	var exceeded bool
	results.FailedCommits, exceeded = checkConsecutiveFailures(
		// Check builds after the failed one we found
		builds[firstFailedBuild:],
		// We already have 1 failed build, so we need to find n-1 more
		opts.FailuresThreshold-1,
		opts.BuildTimeout)
	if !exceeded {
		fmt.Println("threshold not exceeded")
		results.LockModified, err = branch.Unlock(ctx)
		if err != nil {
			return nil, fmt.Errorf("unlockBranch: %w", err)
		}
		return
	}

	fmt.Println("threshold exceeded, this is a big deal!")
	results.LockModified, err = branch.Lock(ctx, results.FailedCommits, []string{"dev-experience"})
	if err != nil {
		return nil, fmt.Errorf("lockBranch: %w", err)
	}

	return
}

func isBuildPassed(build buildkite.Build) bool {
	return build.State != nil && *build.State == "passed"
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

func buildSummary(build buildkite.Build) string {
	summary := []string{*build.Commit}
	if build.State != nil {
		summary = append(summary, *build.State)
	}
	if build.CreatedAt != nil {
		summary = append(summary, "started: "+build.CreatedAt.String())
	}
	if build.FinishedAt != nil {
		summary = append(summary, "finished: "+build.FinishedAt.String())
	}
	return strings.Join(summary, ", ")
}

func checkConsecutiveFailures(builds []buildkite.Build, threshold int, timeout time.Duration) (failedCommits []commitInfo, thresholdExceeded bool) {
	failedCommits = []commitInfo{}

	var consecutiveFailures int
	for _, b := range builds {
		if !isBuildFailed(b, timeout) {
			fmt.Printf("build %d not failed: %+v\n", *b.Number, buildSummary(b))

			if !isBuildPassed(b) {
				// we're only safe if non-failures are actually passed, otherwise
				// keep looking
				continue
			}
			return
		}

		consecutiveFailures += 1
		var author string
		if b.Author != nil {
			author = fmt.Sprintf("%s (%s)", b.Author.Name, b.Author.Email)
		}
		failedCommits = append(failedCommits, commitInfo{
			Commit: *b.Commit,
			Author: author,
		})
		fmt.Printf("build %d is a failure: count %d, %s\n", *b.Number, consecutiveFailures, buildSummary(b))
		if consecutiveFailures >= threshold {
			return failedCommits, true
		}
	}

	return
}