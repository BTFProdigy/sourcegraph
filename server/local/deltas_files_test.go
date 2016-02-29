package local

import (
	"html"
	"reflect"
	"testing"

	"golang.org/x/net/context"

	"sourcegraph.com/sourcegraph/go-diff/diff"
	"src.sourcegraph.com/sourcegraph/go-sourcegraph/sourcegraph"
)

func TestDeltasService_ListFiles(t *testing.T) {
	var s deltas
	ctx, _ := testContext()

	ds := sourcegraph.DeltaSpec{
		Base: sourcegraph.RepoRevSpec{RepoSpec: sourcegraph.RepoSpec{URI: "baserepo"}, Rev: "baserev", CommitID: "basecommit"},
		Head: sourcegraph.RepoRevSpec{RepoSpec: sourcegraph.RepoSpec{URI: "headrepo"}, Rev: "headrev", CommitID: "headcommit"},
	}

	fdiffs := []*diff.FileDiff{
		{
			OrigName: "f",
			NewName:  "f",
			Extended: []string{
				"diff --git f f",
				"index basecommit..headcommit 100644",
			},
			Hunks: []*diff.Hunk{
				{
					OrigStartLine: 1,
					OrigLines:     1,
					NewStartLine:  1,
					NewLines:      1,
					StartPosition: 1,
					Body:          []byte("-a\n+b\n"),
				},
			},
		},
	}

	var calledDiff bool
	s.mockDiffFunc = func(ctx context.Context, ds sourcegraph.DeltaSpec) ([]*diff.FileDiff, *sourcegraph.Delta, error) {
		calledDiff = true
		return fdiffs, nil, nil
	}

	dfs, err := s.ListFiles(ctx, &sourcegraph.DeltasListFilesOp{Ds: ds})
	if err != nil {
		t.Fatal(err)
	}

	want := fdiffs[0]
	got := &dfs.FileDiffs[0].FileDiff
	if !reflect.DeepEqual(got, want) {
		t.Errorf("got\n%+v\n\nwant\n%+v", got, want)
	}

	if !calledDiff {
		t.Error("!calledDiff")
	}
}

func TestDeltasService_ListFiles_Escaped(t *testing.T) {
	var s deltas
	ctx, _ := testContext()

	ds := sourcegraph.DeltaSpec{
		Base: sourcegraph.RepoRevSpec{RepoSpec: sourcegraph.RepoSpec{URI: "baserepo"}, Rev: "baserev", CommitID: "basecommit"},
		Head: sourcegraph.RepoRevSpec{RepoSpec: sourcegraph.RepoSpec{URI: "headrepo"}, Rev: "headrev", CommitID: "headcommit"},
	}

	fdiffs := []*diff.FileDiff{
		{
			OrigName: "f",
			NewName:  "f",
			Extended: []string{
				"diff --git f f",
				"index basecommit..headcommit 100644",
			},
			Hunks: []*diff.Hunk{
				{
					OrigStartLine: 1,
					OrigLines:     1,
					NewStartLine:  1,
					NewLines:      1,
					StartPosition: 1,
					Body:          []byte(html.EscapeString("-<div>what</div>\n+<div>no way</div>\n")),
				},
			},
		},
	}

	var calledDiff bool
	s.mockDiffFunc = func(ctx context.Context, ds sourcegraph.DeltaSpec) ([]*diff.FileDiff, *sourcegraph.Delta, error) {
		calledDiff = true
		return fdiffs, nil, nil
	}

	dfs, err := s.ListFiles(ctx, &sourcegraph.DeltasListFilesOp{Ds: ds})
	if err != nil {
		t.Fatal(err)
	}

	want := fdiffs[0]
	got := &dfs.FileDiffs[0].FileDiff
	if !reflect.DeepEqual(got, want) {
		t.Errorf("got\n%+v\n\nwant\n%+v", got, want)
	}

	if !calledDiff {
		t.Error("!calledDiff")
	}
}
