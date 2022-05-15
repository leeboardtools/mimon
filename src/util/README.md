# mi-util
This repo contains non-ui utility code shared amongst the various mi repos. It originally came from https://github.com/leeboardtools/mimon.

The repo is a sub-repo of mimon.

## Update from the sub-repo
To update the sub-repo in mimon, run the following git commands (the remote is assigned to `util`):

1. Do a fetch on the sub-repo's remote.

`git fetch util`

2. Do a squash merge from the sub-repo's 'main' branch.

`git merge -s subtree --squash util/main`

If the merge fails, try `git merge -X subtree=src/util --squash util/main`

3. You then need to commit the merge.


## Backport changes to the sub-repo
To backport changes in mimom to the sub-repo, run the following git commands (the remote is assigned to `util`):

1. Create and checkout a branch for the sub-repo's 'main' branch:

`git checkout -b backport-util util/main`

2. Cherry pick the commits that are in the 'util' folder.

`git cherry-pick -x --strategy=subtree main`

3. Push the new commits up to the sub-repo remote.

`git push`


## Set up a sub-repo
1. Set up the remote and fetch it.

`git remote add -f util https://github.com/leeboardtools/mi-util.git`

2. If you want the full sub-repo history in your project:

`git merge -s ours --no-commit --allow-unrelatedhistories util/main`

3. Read the 'main' branch of the sub-repo into the subdirectory 'util':

`git read-tree --prefix=src/util/ -u util/main`

4. Commit the merge.

