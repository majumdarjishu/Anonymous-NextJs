#!/bin/sh
git filter-branch -f --env-filter '
CORRECT_NAME="jishu majumdar"
export GIT_COMMITTER_NAME="$CORRECT_NAME"
export GIT_AUTHOR_NAME="$CORRECT_NAME"
' --tag-name-filter cat -- --branches --tags
