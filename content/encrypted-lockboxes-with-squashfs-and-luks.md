---
title: "Using squashfs for fast, encrypted Torizon Secure Offline Updates (Lockboxes)"
date: 2026-09-09
author: Jon Oster, Principal Product Security Architect
draft: false

tags: ["Security", "Embedded", "Linux", "Uptane", "CRA", "Encryption"]

abstract: Torizon Offline Updates are quite flexible, and can be delivered as a single file in squashfs format. This brings a number of benefits--among them the ability to easily add encryption to the lockbox images you distribute.
---

[Torizon Offline Updates](https://developer.toradex.com/torizon/torizon-platform/torizon-updates/secure-offline-updates/how-to-use-secure-offline-updates-with-torizoncore) fire when a lockbox appears at a configured path. That works, but USB media is awkward in two ways:

1. **Mount paths depend on the volume label** (`/media/<label>-…`), so update sticks need a pre-agreed label, or the lockbox won't appear at the correct path.
2. **OSTree lockboxes are many small files**, which can perform poorly on removable media—especially older filesystems like FAT.

We can instead ship the lockbox as a single squashfs image with a fixed name. All we need to do is add a small systemd [path unit](https://www.freedesktop.org/software/systemd/man/latest/systemd.path.html) that finds it on any mounted USB volume and loop-mounts it to where Aktualizr already looks.

As a bonus, using squashfs makes it easy for us to encrypt the lockbox.

## How it works

Torizon’s `usermount` already mounts USB partitions under `/media` (`/var/rootdirs/media`). A systemd **path** unit watches for `torizon-lockbox.squashfs`; when it appears, a oneshot **service** loop-mounts the image at a stable path (`/mnt/signed-squashfs`). We point Aktualizr’s offline-update path configuration there. A **udev** rule stops the service (and thus unmounts) when the USB stick is removed.

A couple of minor details:

* The mount script **always exits 0**, even on verify/mount failure. We use an `EXIT` trap to ensure this. This was the easiest way to deal with the problem of a script failure causing systemd to either retry in a loop, or end up in a failed state that wasn't cleared when removing the USB stick.
* The udev rule technically fires when _any_ USB mass storage is removed. If you unplug a different USB stick while your lockbox-containing stick is present, it will briefly unmount the squashfs image (and then immediately remount it).
* Similarly, if you have two USB sticks plugged in that each contain a `torizon-lockbox.squashfs` file, the first one you plug in will be mounted. If you unplug the one that's mounted, the systemd path unit will immediately mount the other one, most likely triggering another update.

## Implementation

This was initially small enough to publish as small code snippets inline, but I decided to publish it to github. The initial version is [here](https://github.com/torizon/squashfs-lockboxes/tree/master/basic) ([.path unit](https://github.com/torizon/squashfs-lockboxes/blob/master/basic/etc/systemd/system/squashfs-automount.path), [systemd oneshot service](https://github.com/torizon/squashfs-lockboxes/blob/master/basic/etc/systemd/system/squashfs-automount.service), [mount](https://github.com/torizon/squashfs-lockboxes/blob/master/basic/etc/squashfs-automount/mount.sh) and [umount](https://github.com/torizon/squashfs-lockboxes/blob/master/basic/etc/squashfs-automount/umount.sh) scripts, [udev rule](https://github.com/torizon/squashfs-lockboxes/blob/master/basic/etc/udev/rules.d/99-squashfs-automount.rules)). I also included a small [shell script](https://github.com/torizon/squashfs-lockboxes/blob/master/basic/install.sh) you can use to install it--download the release tarball and you can run the install script to put all the files in the right place.

## Security

This basic architecture shouldn't have major security risks. Lockboxes are still thoroughly validated before installation, and we're only changing the delivery mechanism slightly. However, there is one change in security posture compared to stock [hardened](https://developer.toradex.com/torizon/security/production-hardening/) Torizon OS that this brings: squashfs has, in the past, had kernel CVEs that were triggerable by malicious images. There aren't any CVEs like this that affect Torizon OS as of the date of publication, but of course there could be in the future. This is the same class of risk when allowing any type of filesystem to auto-mount.

If you want to mitigate that risk, you could also add a signature check before the image is mounted. I've implemented a basic version of that in the [signed](https://github.com/torizon/squashfs-lockboxes/tree/master/signed) directory of the repo.

## Encryption

Finally, there's one big headline feature that using squashfs makes a lot easier: we can encrypt the image using a LUKS wrapper. The changes required are relatively minor, so I won't rehash them here. You can read the [LUKS variant](https://github.com/torizon/squashfs-lockboxes/tree/master/luks) docs and implementation on github.

A couple things to watch out for:

* This is a basic, demo implementation. It uses a 64-character random password, but that password needs to exist on the device. So if your threat model includes, for example, someone desoldering the eMMC chip on the module and reading it, or using recovery mode to load an arbitrary kernel, you should add other protections. I have a [short section](https://github.com/torizon/squashfs-lockboxes/blob/master/README.md#security) on this in the readme, but it boils down to "use Torizon's already-excellent support for [secure boot](https://developer.toradex.com/torizon/security/how-to-integrate-secure-boot) and [encryption](https://github.com/toradex/meta-toradex-security/blob/scarthgap-7.x.y/docs/README-encryption.md)".
* LUKS uses a key derivation function called [Argon2](https://en.wikipedia.org/wiki/Argon2) by default. Argon2 is designed to be resistant to cracking by being memory-hard: deriving the key from the password takes a configurable amount of memory, but the default for LUKS is usually around 200MiB. That's a bit too much for a typical embedded device, so you might want to either switch to a smaller allocation, or use a CPU-bound KDF. This is also documented in the [LUKS README](https://github.com/torizon/squashfs-lockboxes/blob/master/luks/README.md#notes-on-kdf-constraints-on-embedded-devices) in the repo.

## Final thoughts

This was easy enough to implement, but it does have some flaws. I've proposed to the teams working on TorizonCore Builder and Torizon OS to add some official support for it, but as of now it's going to live as a demo repository. That being said, I think it's a fairly straightforward, robust implementation, and would be willing to use it in a production device (subject to its risk assessment and security posture, of course!). Have fun!