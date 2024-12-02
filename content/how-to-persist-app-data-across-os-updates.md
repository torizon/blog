---
title: How to Persist Application Data Across Torizon OS Updates
date: 2024-12-02
author: Leonardo Graboski Veiga, Product Owner Torizon OS
draft: false
tags:
    - Container
    - Embedded
    - Linux
abstract: How to make sure your application data is not overwritten or erased by OS Updates
image: ./types-of-mounts.webp
---

The Torizon OS is designed around the concept that different parties handle _applications_ and _OS_ development:

- Applications: you, as a Torizon customer, develop and update your application on your development cycle
- OS: we, the Torizon OS Team at Toradex, develop and update the base OS, releasing it every quarter

A question I sometimes get from customers is: how can I keep my application data when updating the base OS?

## A Practical Answer

**You must store the application data somewhere under the `/var` or the `/etc` directory**. OSTree, the file system management tool used for OS Updates, keeps the `/var` directory intact during the updates. Also, OSTree only touches files under `/etc` if they haven't been modified outside its knowledge, known as a [3-way merge](https://ostreedev.github.io/ostree/atomic-upgrades/#assembling-a-new-deployment-directory).

Therefore, the two standard Docker [storage methods](https://docs.docker.com/engine/storage/), _volumes_ and _bind mounts_, are ok to use.

![Types of Mounts](/types-of-mounts.webp)
*Figure 1: Types of Mounts (source: Docker Docs)*

You can use [Volumes](https://docs.docker.com/engine/storage/volumes/), as they are effectively stored under `/var` by default, specifically under `/var/lib/docker/volumes`. Therefore you can safely use them as documented by Docker.

Here is an example that uses a volume named `my-app` to store data from a container’s directory named `my-app` under `/etc`:

```sh
docker run -v my-app:/etc/my-app app-container
```

Or, you can also use [Bind Mounts](https://docs.docker.com/engine/storage/bind-mounts/), as long as keeping the mount somewhere under `/var` or `/etc`. The `/home/torizon` directory is recommended, as it is symlinked to `/var` and owned by the `torizon` user.

Here is an example that shares a directory named `my-app` from the torizon home directory to a container that expects to store data in the directory named `my-app` under `/etc`:

```sh
docker run -v /home/torizon/my-app:/etc/my-app app-container
```

Another example shares a directory named `my-app` from the `/etc` directory to a container that expects to store data in the directory named `my-app` under `/etc`.

```sh
docker run -v /etc/my-app:/etc/my-app app-container
```

Notice that without the bind mount, the base OS and the container `/etc/my-app` would be two different directories.

## `/var` or `/etc`?

Using `/etc` lets you use TorizonCore Builder to [preinstall files in the base OS](https://developer.toradex.com/torizon/os-customization/use-cases/capturing-changes-in-the-configuration-of-a-board-on-torizoncore/), so you have them installed during [production programming](https://developer.toradex.com/torizon/torizoncore/production-programming-in-torizon/), as opposed to having such files preinstalled on the container and copied to the destination during initial startup.

Alternatively, by using `/var` you don't need to consider the implications of OSTree's 3-way merge and you get the `/home/torizon` directory owned by the _torizon_ user out-of-the-box.

Therefore, if your application is going to create data from scratch, you might take slight advantage of `/var`, whereas if your application expects some pre-filled data during the first startup and you want to keep this data detached from the application container, `/etc` might be a better option.

## Bind Mount or Volume?

The Docker [storage](https://docs.docker.com/engine/storage/) page recommends volumes as the best way to persist data in Docker.

On the one hand, the most compelling use cases for volumes may be irrelevant when considering the Torizon OS use cases: running containers on Windows or having an unknown file system structure.

On the other hand, bind mounts don't seem to provide any advantage over volumes _for storing application data_.

Therefore it seems natural to choose volumes unless you identify specific needs for a bind mount in your project, like the previously described pre-installation of data on the base OS.

## Conclusion

Using the standard Docker data storage mechanisms, you can easily make your application data persist across Torizon OS Updates. Just make sure to keep this data under `/var` or `/etc`.
