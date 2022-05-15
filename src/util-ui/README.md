# mi-util-ui
This repo contains UI utility code shared amongst the various mi repos. It originally came from https://github.com/leeboardtools/mimon.

It expects the mi-util repo also be available in `../util`.

The repo is a sub-repo of mimon.

## Update from the sub-repo
To update the sub-repo in mimon, run the following git commands (the remote is assigned to `util-ui`):

1. Do a fetch on the sub-repo's remote.

`git fetch util-ui`

2. Do a squash merge from the sub-repo's 'main' branch.

`git merge -s subtree --squash util-ui/main`

If the merge fails, try `git merge -X subtree=src/util-ui --squash util-ui/main`

3. You then need to commit the merge.


## Backport changes to the sub-repo
To backport changes in mimom to the sub-repo, run the following git commands (the remote is assigned to `util-ui`):

1. Create and checkout a branch for the sub-repo's 'main' branch:

`git checkout -b backport-util-ui util-ui/main`

2. Cherry pick the commits that are in the 'util-ui' folder.

`git cherry-pick -x --strategy=subtree main`

3. Push the new commits up to the sub-repo remote.

`git push`


## Set up a sub-repo
1. Set up the remote and fetch it. Don't forget to set up https://github.com/leeboardtools/mi-util as a sub-repo as well.

`git remote add -f util-ui https://github.com/leeboardtools/mi-util-ui.git`

2. If you want the full sub-repo history in your project:

`git merge -s ours --no-commit --allow-unrelatedhistories util-ui/main`

3. Read the 'main' branch of the sub-repo into the subdirectory 'util-ui':

`git read-tree --prefix=src/util-ui/ -u util-ui/main`

4. Commit the merge.

