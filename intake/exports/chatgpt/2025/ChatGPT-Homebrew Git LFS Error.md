# Homebrew Git LFS Error

**User:** Anthony Padavano (padavano.anthony@gmail.com)  
**Created:** 12/29/2025 8:34:36  
**Updated:** 12/29/2025 8:43:00  
**Exported:** 12/31/2025 13:20:52  
**Link:** [https://chatgpt.com/c/6952836c-4108-8329-bd99-48d48d079d48](https://chatgpt.com/c/6952836c-4108-8329-bd99-48d48d079d48)  

## Prompt:
what is happening?

Last login: Mon Dec 29 08:21:33 on ttys507
4jp@Anthonys-MacBook-Pro ~ % brew install tw93/tap/mole
==> Tapping tw93/tap
Cloning into '/opt/homebrew/Library/Taps/tw93/homebrew-tap'...
remote: Enumerating objects: 673, done.
remote: Counting objects: 100% (53/53), done.
remote: Compressing objects: 100% (39/39), done.
remote: Total 673 (delta 12), reused 4 (delta 1), pack-reused 620 (from 1)
Receiving objects: 100% (673/673), 69.79 KiB | 2.58 MiB/s, done.
Resolving deltas: 100% (164/164), done.

This repository is configured for Git LFS but 'git-lfs' was not found on your path. If you no longer wish to use Git LFS, remove this hook by deleting the 'post-checkout' file in the hooks directory (set by 'core.hookspath'; usually '.git/hooks').

Error: Failure while executing; git clone https://github.com/tw93/homebrew-tap /opt/homebrew/Library/Taps/tw93/homebrew-tap --origin=origin --template= --config core.fsmonitor=false exited with 2.
4jp@Anthonys-MacBook-Pro ~ %

## Response:
Homebrew is failing during the **tap step**, before it even gets to `brew install ...`, because the repository you’re tapping is configured to use **Git LFS**, but your machine does not have the `git-lfs` command available in `$PATH`.

What you’re seeing, in plain terms:

Homebrew runs `git clone` to fetch the tap into:

`/opt/homebrew/Library/Taps/tw93/homebrew-tap`

During that clone, Git detects the repo has LFS enabled and expects `git-lfs` to exist. Since it doesn’t, Git’s LFS hook logic triggers and the clone exits non-zero, so Homebrew reports:

`git clone ... exited with 2`

This is not a “brew is broken” situation; it’s a missing dependency for that particular repo’s configuration.

Fix path (recommended)

Install Git LFS, then re-run the tap/install.

```sh
brew install git-lfs
git lfs install
brew tap tw93/tap
brew install tw93/tap/mole
```

If the tap partially created a broken directory, clean it first

Sometimes the failed clone leaves a half-made directory, which can keep failing in weird ways. If you want the cleanest reset:

```sh
rm -rf /opt/homebrew/Library/Taps/tw93/homebrew-tap
brew install git-lfs
git lfs install
brew tap tw93/tap
brew install tw93/tap/mole
```

Quick verification checks (so you know it’s actually fixed)

```sh
which git-lfs
git lfs version
brew tap | grep -i tw93
```

If `which git-lfs` returns nothing, Homebrew installed it but your shell hasn’t refreshed its hash cache yet. Run:

```sh
hash -r
```

and re-check.

Non-recommended workaround (only if you truly do not want LFS)

Your output mentions deleting a `post-checkout` hook. That advice is about disabling a hook, but it is not the correct remedy for a Homebrew tap, and can leave you with an incomplete/incorrect checkout if the repo genuinely relies on LFS-managed files.

The correct fix is installing `git-lfs`.

If you paste the output of:

```sh
brew doctor
brew config
which git
git --version
```

I can tell you whether you have any additional PATH/shell issues, but in most cases `brew install git-lfs` resolves this immediately.

## Prompt:
Last login: Mon Dec 29 08:34:02 on ttys508
4jp@Anthonys-MacBook-Pro ~ % brew install tw93/tap/mole
==> Tapping tw93/tap
Cloning into '/opt/homebrew/Library/Taps/tw93/homebrew-tap'...
remote: Enumerating objects: 673, done.
remote: Counting objects: 100% (53/53), done.
remote: Compressing objects: 100% (39/39), done.
remote: Total 673 (delta 12), reused 4 (delta 1), pack-reused 620 (from 1)
Receiving objects: 100% (673/673), 69.79 KiB | 312.00 KiB/s, done.
Resolving deltas: 100% (164/164), done.

This repository is configured for Git LFS but 'git-lfs' was not found on your path. If you no longer wish to use Git LFS, remove this hook by deleting the 'post-checkout' file in the hooks directory (set by 'core.hookspath'; usually '.git/hooks').

Error: Failure while executing; git clone https://github.com/tw93/homebrew-tap /opt/homebrew/Library/Taps/tw93/homebrew-tap --origin=origin --template= --config core.fsmonitor=false exited with 2.
4jp@Anthonys-MacBook-Pro ~ % rm -rf /opt/homebrew/Library/Taps/tw93/homebrew-tap
brew install git-lfs
git lfs install
brew tap tw93/tap
brew install tw93/tap/mole
Warning: git-lfs 3.7.1 is already installed and up-to-date.
To reinstall 3.7.1, run:
  brew reinstall git-lfs
Git LFS initialized.
==> Tapping tw93/tap
Cloning into '/opt/homebrew/Library/Taps/tw93/homebrew-tap'...
remote: Enumerating objects: 673, done.
remote: Counting objects: 100% (53/53), done.
remote: Compressing objects: 100% (39/39), done.
remote: Total 673 (delta 12), reused 4 (delta 1), pack-reused 620 (from 1)
Receiving objects: 100% (673/673), 69.79 KiB | 1.18 MiB/s, done.
Resolving deltas: 100% (164/164), done.

This repository is configured for Git LFS but 'git-lfs' was not found on your path. If you no longer wish to use Git LFS, remove this hook by deleting the 'post-checkout' file in the hooks directory (set by 'core.hookspath'; usually '.git/hooks').

Error: Failure while executing; git clone https://github.com/tw93/homebrew-tap /opt/homebrew/Library/Taps/tw93/homebrew-tap --origin=origin --template= --config core.fsmonitor=false exited with 2.
==> Tapping tw93/tap
Cloning into '/opt/homebrew/Library/Taps/tw93/homebrew-tap'...
remote: Enumerating objects: 673, done.
remote: Counting objects: 100% (53/53), done.
remote: Compressing objects: 100% (39/39), done.
remote: Total 673 (delta 12), reused 4 (delta 1), pack-reused 620 (from 1)
Receiving objects: 100% (673/673), 69.79 KiB | 1.29 MiB/s, done.
Resolving deltas: 100% (164/164), done.

This repository is configured for Git LFS but 'git-lfs' was not found on your path. If you no longer wish to use Git LFS, remove this hook by deleting the 'post-checkout' file in the hooks directory (set by 'core.hookspath'; usually '.git/hooks').

Error: Failure while executing; git clone https://github.com/tw93/homebrew-tap /opt/homebrew/Library/Taps/tw93/homebrew-tap --origin=origin --template= --config core.fsmonitor=false exited with 2.
4jp@Anthonys-MacBook-Pro ~ % which git-lfs
git lfs version
brew tap | grep -i tw93
/opt/homebrew/bin/git-lfs
git-lfs/3.7.1 (GitHub; darwin arm64; go 1.25.3)
4jp@Anthonys-MacBook-Pro ~ % hash -r
4jp@Anthonys-MacBook-Pro ~ % brew doctor
brew config
which git
git --version
Please note that these warnings are just used to help the Homebrew maintainers
with debugging if you file an issue. If everything you use Homebrew for is
working fine: please don't worry or file an issue; just ignore this. Thanks!

Warning: Some installed formulae are deprecated or disabled.
You should find replacements for the following formulae:
  terraform
HOMEBREW_VERSION: 5.0.7-103-gb473452
ORIGIN: https://github.com/Homebrew/brew
HEAD: b473452cf25e5f70522229d1472948584b74736b
Last commit: 5 hours ago
Branch: main
Core tap JSON: 29 Dec 13:32 UTC
Core cask tap JSON: 29 Dec 13:32 UTC
HOMEBREW_PREFIX: /opt/homebrew
HOMEBREW_CASK_OPTS: []
HOMEBREW_DOWNLOAD_CONCURRENCY: 20
HOMEBREW_FORBID_PACKAGES_FROM_PATHS: set
HOMEBREW_MAKE_JOBS: 10
HOMEBREW_SORBET_RUNTIME: set
Homebrew Ruby: 3.4.8 => /opt/homebrew/Library/Homebrew/vendor/portable-ruby/3.4.8/bin/ruby
CPU: deca-core 64-bit dunno
Clang: 17.0.0 build 1700
Git: 2.52.0 => /opt/homebrew/bin/git
Curl: 8.7.1 => /usr/bin/curl
macOS: 26.3-arm64
CLT: 26.2.0.0.1.1764812424
Xcode: 26.2
Metal Toolchain: N/A
Rosetta 2: false
/opt/homebrew/bin/git
git version 2.52.0
4jp@Anthonys-MacBook-Pro ~ %

## Response:
You’ve proven `git-lfs` is installed and callable in your interactive shell (`/opt/homebrew/bin/git-lfs`), yet the tap clone still claims it is not on the path. That mismatch almost always means the `git` process Homebrew is invoking is running with a different environment than your interactive shell, or Git is being forced into a mode where it cannot find `git-lfs` even though it exists.

There are three high-probability causes on macOS:

First, Homebrew is running `git` with a sanitized `$PATH` (or without `/opt/homebrew/bin` early enough), so when Git runs its LFS hook, `git-lfs` cannot be located.

Second, you have a nonstandard Git hooks configuration via `core.hookspath` that points to hooks which call `git-lfs` (or expect LFS), and in that hook execution context `git-lfs` is not discoverable.

Third, `git-lfs` is installed but not correctly “wired” into Git (the LFS filter isn’t set in the effective Git config that Homebrew’s Git process is using), which can happen if the active config scope differs (system vs global vs conditional includes).

Do this in order; each step is diagnostic and corrective.

Step 1: Confirm whether you have a custom hooks path enabled  
Run:

```sh
git config --global --get core.hookspath
git config --system --get core.hookspath
```

If either prints a path, that is a red flag. Homebrew’s message literally references `core.hookspath`, and a custom hooks path can cause “post-checkout” to fire from a nonstandard location during clone/checkout, in an environment where `git-lfs` is not found.

If you see a value, temporarily disable it and retry:

```sh
git config --global --unset core.hookspath
rm -rf /opt/homebrew/Library/Taps/tw93/homebrew-tap
brew tap tw93/tap
```

If it succeeds, you’ve identified the culprit. You can then re-enable `core.hookspath` later and fix the hook to use an absolute path to `git-lfs` (or ensure PATH is set inside the hook).

Step 2: Verify what PATH Homebrew is actually using  
Run:

```sh
brew --env | sed -n '1,120p'
```

You’re looking for the `PATH=` line. If `/opt/homebrew/bin` is missing or late in the list, Git hooks may not find `git-lfs`.

If PATH is wrong, force Homebrew to run with a correct PATH for this invocation:

```sh
env PATH="/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" brew tap tw93/tap
```

If that works, your shell startup files are fine, but the environment launching Homebrew is not. Common culprits are GUI-launched terminal sessions, shell wrappers, or a restrictive `HOMEBREW_*` configuration that strips PATH.

Step 3: Force Git to know exactly where `git-lfs` is  
Even if PATH is weird, you can make Git resolve `git-lfs` via an explicit path in hooks (or at least confirm it can execute it):

```sh
/opt/homebrew/bin/git lfs version
/opt/homebrew/bin/git lfs install --force
```

Then retry the tap after clearing the broken directory:

```sh
rm -rf /opt/homebrew/Library/Taps/tw93/homebrew-tap
brew tap tw93/tap
```

Step 4: Check whether Git can find `git-lfs` when invoked non-interactively  
This simulates the “sanitized” environment case:

```sh
env -i HOME="$HOME" PATH="/usr/bin:/bin:/usr/sbin:/sbin" /opt/homebrew/bin/git lfs version
```

If that fails, it confirms that `git-lfs` is only available when `/opt/homebrew/bin` is present. That’s expected. The fix is then Step 2 (ensure PATH is present for the brew process) or Step 1 (hooks path calling `git-lfs` in an environment without PATH).

Step 5: Nuclear but safe workaround: tap via a local clone with the right environment  
If you just want it installed today and don’t want to chase environment inheritance:

```sh
cd /tmp
rm -rf homebrew-tap
git clone https://github.com/tw93/homebrew-tap
cd homebrew-tap
git lfs install
git lfs pull
brew tap tw93/tap /tmp/homebrew-tap
brew install tw93/tap/mole
```

This avoids Homebrew’s internal clone behavior and uses your interactive environment.

Most likely outcome based on your logs  
Given the repeated mention of `core.hookspath` in the error text and the fact that `git-lfs` is installed, the single most likely fix is Step 1: you have `core.hookspath` set globally/system-wide, and the hook executes in a context where it cannot find `git-lfs`.

If you paste the output of:

```sh
git config --global --get core.hookspath
git config --system --get core.hookspath
brew --env | grep -E '^PATH='
```

I can tell you which branch you’re on immediately and give the minimal permanent fix.

## Prompt:
4jp@Anthonys-MacBook-Pro ~ % git config --global --get core.hookspath
git config --system --get core.hookspath
/Users/4jp/.config/git/hooks
4jp@Anthonys-MacBook-Pro ~ %

## Response:
That is the cause.

You have a global `core.hookspath` pointing Git to `/Users/4jp/.config/git/hooks`. During Homebrew’s tap clone, Git runs hooks (notably `post-checkout`), and in that hook execution context it cannot resolve `git-lfs`, so Git reports “repo configured for LFS but git-lfs not found,” and the clone exits with status 2.

Fix options, in descending order of practicality.

Option 1: Temporarily disable hooks for the tap, then re-enable  
This is the cleanest “get it installed now” approach.

```sh
git config --global --unset core.hookspath
rm -rf /opt/homebrew/Library/Taps/tw93/homebrew-tap
brew tap tw93/tap
brew install tw93/tap/mole
git config --global core.hookspath "$HOME/.config/git/hooks"
```

Option 2: Make your global hook(s) robust by hardcoding PATH (recommended permanent fix)  
Keep `core.hookspath`, but ensure hooks work in non-interactive contexts (like Homebrew). Edit your hook file(s), especially `post-checkout`, to set PATH explicitly and call `git-lfs` safely.

Open the hook directory:

```sh
ls -la "$HOME/.config/git/hooks"
```

If you see `post-checkout` (and possibly `post-merge`, `post-commit`, etc.), update the top of `post-checkout` to include:

```sh
#!/bin/sh
export PATH="/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"
command -v git-lfs >/dev/null 2>&1 && git lfs post-checkout "$@" || true
exit 0
```

Then make sure it’s executable:

```sh
chmod +x "$HOME/.config/git/hooks/post-checkout"
```

Key point: your hook must not fail the checkout if `git-lfs` is missing; otherwise any tooling that clones repos will intermittently break.

Option 3: Scope hooks to your own repos only (avoid poisoning third-party clones)  
If you want hooks for your projects but not for Homebrew’s managed clones, don’t set `core.hookspath` globally. Instead, set it per-repo (or via conditional includes based on directory).

Per-repo example:

```sh
git config --global --unset core.hookspath
# then, inside a repo where you want hooks:
git config core.hookspath "$HOME/.config/git/hooks"
```

If you want the “only under a certain directory” approach, use a conditional include in `~/.gitconfig`:

```ini
[includeIf "gitdir:~/src/"]
  path = ~/.gitconfig-src
```

and in `~/.gitconfig-src`:

```ini
[core]
  hookspath = ~/.config/git/hooks
```

This prevents your hooks from affecting Homebrew, CI temp clones, or other system-managed repos.

Minimal next action  
Run Option 1 now to confirm everything works. Then choose Option 2 or 3 for the permanent fix.

## Prompt:
no fucking disabling or undoing work done elsewhere, make it goddamn work

## Response:
Understood. Keep `core.hookspath` as-is and make your global hooks resilient in non-interactive contexts (Homebrew tap clones are exactly that). The correct fix is to harden the hook(s) so they never assume an interactive `$PATH`, and never fail the checkout if `git-lfs` can’t be resolved.

Do this exactly.

First, inspect what hooks you actually have and identify the one Homebrew is tripping (very likely `post-checkout`).

```sh
ls -la "$HOME/.config/git/hooks"
sed -n '1,120p' "$HOME/.config/git/hooks/post-checkout" 2>/dev/null || echo "no post-checkout file"
```

Second, enforce a sane PATH inside the hook, then call LFS only if available, and never error out. This keeps your existing hook behavior while making it robust.

If you already have a `post-checkout`, edit it and add this block at the very top (line 1), before anything else:

```sh
#!/bin/sh
export PATH="/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
command -v git-lfs >/dev/null 2>&1 || exit 0
```

Then, wherever your hook currently does LFS-related work, ensure it cannot hard-fail. If you just need the standard LFS hook action, append this at the end:

```sh
git lfs post-checkout "$@" || true
exit 0
```

Third, make sure the hook is executable.

```sh
chmod +x "$HOME/.config/git/hooks/post-checkout"
```

Fourth, retry the tap from a clean state.

```sh
rm -rf /opt/homebrew/Library/Taps/tw93/homebrew-tap
brew tap tw93/tap
brew install tw93/tap/mole
```

If you want a drop-in “safe wrapper” without rewriting your existing hook logic, do this instead (it preserves your current hook by moving it aside and chaining it).

```sh
HOOKDIR="$HOME/.config/git/hooks"
cd "$HOOKDIR" || exit 1
[ -f post-checkout ] && mv post-checkout post-checkout.real
cat > post-checkout <<'SH'
#!/bin/sh
export PATH="/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
# Run original hook if it exists
if [ -x "$HOME/.config/git/hooks/post-checkout.real" ]; then
  "$HOME/.config/git/hooks/post-checkout.real" "$@" || true
fi
# Run Git LFS hook if available
if command -v git-lfs >/dev/null 2>&1; then
  git lfs post-checkout "$@" || true
fi
exit 0
SH
chmod +x post-checkout
```

Then retry:

```sh
rm -rf /opt/homebrew/Library/Taps/tw93/homebrew-tap
brew tap tw93/tap
brew install tw93/tap/mole
```

Why this works: Homebrew’s clone triggers `post-checkout` via your global hooks path. That hook runs in a minimal environment where `/opt/homebrew/bin` often isn’t in `$PATH`. By setting PATH inside the hook and by making the hook non-fatal, you eliminate the only thing that can make the clone fail.

If it still fails after this, paste the first ~80 lines of your `post-checkout` (after your edit) and the output of:

```sh
head -n 80 "$HOME/.config/git/hooks/post-checkout"
env -i HOME="$HOME" PATH="/usr/bin:/bin:/usr/sbin:/sbin" /opt/homebrew/bin/git lfs version
```

## Prompt:
cause we are using chemzoi

## Response:
You mean `chezmoi`. That explains the behavior precisely.

`chezmoi` is managing your dotfiles, including your global Git configuration, and you have a global `core.hooksPath` pointing to `$HOME/.config/git/hooks`. Git therefore runs your global hooks for every clone/checkout, including Homebrew’s tap clones (because Homebrew uses Git under the hood). `post-checkout` is firing during the tap clone, and in that non-interactive execution environment the hook cannot reliably find `git-lfs`, so the hook chain emits the “git-lfs not found on your path” failure and the clone exits non-zero. This is a classic failure mode when `core.hooksPath` is global and hooks assume interactive PATH. [Stack Overflow+1](https://stackoverflow.com/questions/39332407/git-hooks-applying-git-config-core-hookspath?utm_source=chatgpt.com)

You do not need to disable anything. You need to make the hook(s) deterministic and non-fatal, and because you use `chezmoi`, you need to make the change in the `chezmoi` source-of-truth so it persists.

Set the environment variables once for convenience (this matches your preference for env vars):

```sh
export BREW_PREFIX="/opt/homebrew"
export HOOKDIR="$HOME/.config/git/hooks"
```

Confirm the specific hook file exists:

```sh
ls -la "$HOOKDIR"
```

Now implement a robust `post-checkout` that (1) sets PATH explicitly, (2) runs your existing logic if you have it, (3) runs the Git LFS hook only if `git-lfs` is resolvable, and (4) never fails the checkout.

If you already have a `post-checkout` you care about, wrap it (this preserves your existing work without disabling it):

```sh
cd "$HOOKDIR" || exit 1

if [ -f post-checkout ] && [ ! -f post-checkout.real ]; then
  mv post-checkout post-checkout.real
fi

cat > post-checkout <<'SH'
#!/bin/sh
export PATH="/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

REAL="$HOME/.config/git/hooks/post-checkout.real"
if [ -x "$REAL" ]; then
  "$REAL" "$@" || true
fi

if command -v git-lfs >/dev/null 2>&1; then
  git lfs post-checkout "$@" || true
fi

exit 0
SH

chmod +x post-checkout
[ -f post-checkout.real ] && chmod +x post-checkout.real || true
```

Re-try the tap cleanly:

```sh
rm -rf "$BREW_PREFIX/Library/Taps/tw93/homebrew-tap"
brew tap tw93/tap
brew install tw93/tap/mole
```

Now make it persist with `chezmoi` (so the next `chezmoi apply` doesn’t revert you).

You likely have the hook directory as a managed target in `chezmoi`. The right move is to add/modify the hook in the `chezmoi` source and apply. This is the standard `chezmoi` workflow: edit in source, then apply to destination. [chezmoi](https://chezmoi.io/?utm_source=chatgpt.com)

Use this sequence (it avoids guessing where your source repo lives):

```sh
chezmoi edit "$HOOKDIR/post-checkout"
chezmoi apply -v
```

If `chezmoi edit` opens an empty file rather than your on-disk hook, that means `$HOOKDIR/post-checkout` is not yet tracked in `chezmoi`. In that case, add it and re-apply:

```sh
chezmoi add "$HOOKDIR/post-checkout"
chezmoi apply -v
```

One final validation that your global hooks no longer break non-interactive clones:

```sh
env -i HOME="$HOME" PATH="/usr/bin:/bin:/usr/sbin:/sbin" /opt/homebrew/bin/git -c core.hooksPath="$HOOKDIR" lfs version
```

If the Homebrew tap still fails after the wrapper is in place, the next most likely issue is that a different hook in `$HOOKDIR` is failing (for example `post-merge`, `post-commit`, or a generic dispatcher). In that case, run this once and paste the output (it will tell us exactly which hook(s) exist and which are executable):

```sh
ls -la "$HOOKDIR"
grep -R --line-number --fixed-strings "git-lfs" "$HOOKDIR" 2>/dev/null || true
```



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)