// tslint:disable: typedef ordered-imports

import {formatPattern} from "react-router/lib/PatternUtils";
import {abs} from "sourcegraph/app/routePatterns";
import {RouteName} from "sourcegraph/app/routePatterns";

// urlTo produces the full URL, given a route and route parameters. The
// route names are defined in sourcegraph/app/routePatterns.
export function urlTo(name: RouteName, params: {}): string {
	return formatPattern(`/${abs[name]}`, params);
}

// urlToGitHubOAuth
export function urlToGitHubOAuth(scopes: string | null, returnTo: string | Location | null): string {
	scopes = scopes ? `scopes=${encodeURIComponent(scopes)}` : null;
	if (returnTo && typeof returnTo !== "string") {
		returnTo = `${returnTo.pathname}${returnTo.search}${returnTo.hash}`;
	}
	returnTo = returnTo && returnTo.toString();
	returnTo = returnTo ? `return-to=${encodeURIComponent(returnTo)}` : null;

	let q;
	if (scopes && returnTo) {
		q = `${scopes}&${returnTo}`;
	} else if (scopes) {
		q = scopes;
	} else if (returnTo) {
		q = returnTo;
	}
	return `/-/github-oauth/initiate${q ? `?${q}` : ""}`;
}
export const privateGitHubOAuthScopes = "read:org,repo,user:email";
export const adminRepoGitHubOAuthScopes = "admin:repo_hook";
