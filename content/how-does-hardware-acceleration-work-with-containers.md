---
title: "How does hardware acceleration work with containers?"
date: 2024-06-05
author: Leonardo Held, Torizon Developer
draft: false

tags: ["Performance", "Container", "Linux", "Embedded"]

abstract: A primer on hardware acceleration, cgroup rules and some more.

image: https://upload.wikimedia.org/wikipedia/commons/f/f6/Container_Ship.jpg
---

At Toradex we build Torizon OS, which is a container-based embedded system. What do we mean by that? It means that the applications run in isolated environments called containers. 

This begs the question: how do we access hardware resources like GPIOs from inside the containers, or even worse, how do we get GPU acceleration inside the containers?

## A GPU acceleration primer
To run GPU accelerated applications on Linux in general you need some components in the userspace and some other components in the kernel space. So when you have an application that needs hardware acceleration, you link against libraries that provide a graphics API such as OpenGL which will in turn talk to another library that issues the `ioctl()` calls to the device descriptor created by the GPU driver.

## So... containers?
I hope it's clear that there's a very sharp separation between the userspace components and kernel components for the GPU acceleration. The good thing is that this pattern repeats for every other peripheral and containers are very specifically isolated root filesystems in their own process namespace.

So there are two problems we must solve for running graphically accelerated applications from a container:
- introduce the necessary userspace libraries in this containerized root filesystem 
- somehow expose the device descriptors created by the drivers inside this container should be the same thing as simply running the applications in the "usual" root filesystem

## An example

Let's try running some graphical application from a container to get a feel for how these things work. I'll choose GLMark2 because I also wanna show that there's no performance penalty when running an application from the container; I hope it will become clear that it's just another Linux process with a different root filesystem.

To build this container, we use Docker. Docker uses documents called Dockerfiles which will programatically create this root filesystem for you[^0]. Taking a look at the `graphics-tests-vivante` Container Dockerfile[^1] we see that it simply installs `glmark-es2-wayland` from the Debian repositories. Thankfully, we already build this container so it's available from DockerHub. Let's instantiate it and install `strace` inside; remember, it's just another process with a different filesystem we built:

```text
$ docker container run -e ACCEPT_FSL_EULA=1 -d -it
--name=graphics-tests -v /dev:/dev -v /tmp:/tmp --device-cgroup-rule="c 4:* rmw"
--device-cgroup-rule="c 13:* rmw" --device-cgroup-rule="c 199:* rmw"
--device-cgroup-rule="c 226:* rmw"
torizon/graphics-tests-vivante:stable-rc

# apt update && apt install strace
```

Now let's run `glmark2` with `strace -f` which will show which functions this application will call (and which functions those functions will call) and try to trace the path from application to kernel (the `ioctl()` calls). Note that I also have a Wayland display server and a compositor (Weston) up; assume it has always been there[^2].

```text
root@4eb5d8399c45:/home/torizon# strace -e trace=ioctl,openat -f glmark2-es2-wayland
openat(AT_FDCWD, "/etc/ld.so.cache", O_RDONLY|O_CLOEXEC) = 3
openat(AT_FDCWD, "/lib/aarch64-linux-gnu/libwayland-client.so.0", O_RDONLY|O_CLOEXEC) = 3
openat(AT_FDCWD, "/lib/aarch64-linux-gnu/libwayland-cursor.so.0", O_RDONLY|O_CLOEXEC) = 3
openat(AT_FDCWD, "/lib/aarch64-linux-gnu/libwayland-egl.so.1", O_RDONLY|O_CLOEXEC) = 3
openat(AT_FDCWD, "/lib/aarch64-linux-gnu/libjpeg.so.62", O_RDONLY|O_CLOEXEC) = 3
openat(AT_FDCWD, "/lib/aarch64-linux-gnu/libpng16.so.16", O_RDONLY|O_CLOEXEC) = 3
openat(AT_FDCWD, "/lib/aarch64-linux-gnu/libstdc++.so.6", O_RDONLY|O_CLOEXEC) = 3
openat(AT_FDCWD, "/lib/aarch64-linux-gnu/libm.so.6", O_RDONLY|O_CLOEXEC) = 3
openat(AT_FDCWD, "/lib/aarch64-linux-gnu/libgcc_s.so.1", O_RDONLY|O_CLOEXEC) = 3
openat(AT_FDCWD, "/lib/aarch64-linux-gnu/libc.so.6", O_RDONLY|O_CLOEXEC) = 3
openat(AT_FDCWD, "/lib/aarch64-linux-gnu/libffi.so.8", O_RDONLY|O_CLOEXEC) = 3
openat(AT_FDCWD, "/lib/aarch64-linux-gnu/libpthread.so.0", O_RDONLY|O_CLOEXEC) = 3
openat(AT_FDCWD, "/lib/aarch64-linux-gnu/libz.so.1", O_RDONLY|O_CLOEXEC) = 
openat(AT_FDCWD, "/usr/share/glmark2/models", O_RDONLY|O_NONBLOCK|O_CLOEXEC|O_DIRECTORY) = 3
openat(AT_FDCWD, "/usr/share/glmark2/textures", O_RDONLY|O_NONBLOCK|O_CLOEXEC|O_DIRECTORY) = 3
openat(AT_FDCWD, "/etc/ld.so.cache", O_RDONLY|O_CLOEXEC) = 6
openat(AT_FDCWD, "/lib/aarch64-linux-gnu/libEGL.so", O_RDONLY|O_CLOEXEC) = 6
openat(AT_FDCWD, "/lib/aarch64-linux-gnu/libGAL.so", O_RDONLY|O_CLOEXEC) = 6
openat(AT_FDCWD, "/lib/aarch64-linux-gnu/libwayland-server.so.0", O_RDONLY|O_CLOEXEC) = 6
openat(AT_FDCWD, "/lib/aarch64-linux-gnu/libdrm.so.2", O_RDONLY|O_CLOEXEC) = 6
openat(AT_FDCWD, "/lib/aarch64-linux-gnu/libgbm.so.1", O_RDONLY|O_CLOEXEC) = 6
openat(AT_FDCWD, "/lib/aarch64-linux-gnu/libgbm_viv.so", O_RDONLY|O_CLOEXEC) = 6
openat(AT_FDCWD, "/etc/ld.so.cache", O_RDONLY|O_CLOEXEC) = 6
openat(AT_FDCWD, "/lib/aarch64-linux-gnu/libGLESv1_CM.so", O_RDONLY|O_CLOEXEC) = 6
openat(AT_FDCWD, "/lib/aarch64-linux-gnu/libVSC.so", O_RDONLY|O_CLOEXEC) = 6
openat(AT_FDCWD, "/etc/ld.so.cache", O_RDONLY|O_CLOEXEC) = 6
openat(AT_FDCWD, "/lib/aarch64-linux-gnu/libGLESv2.so", O_RDONLY|O_CLOEXEC) = 6
openat(AT_FDCWD, "/etc/ld.so.cache", O_RDONLY|O_CLOEXEC) = 6
openat(AT_FDCWD, "/etc/ld.so.cache", O_RDONLY|O_CLOEXEC) = 6
openat(AT_FDCWD, "/lib/aarch64-linux-gnu/libOpenVG.so", O_RDONLY|O_CLOEXEC) = 6
openat(AT_FDCWD, "/dev/galcore", O_RDWR) = 6
[pid 204] ioctl(6, _IOC(_IOC_NONE, 0x75, 0x30, 0), 0xffffe1e7eaf8) = 0
[pid 205] openat(AT_FDCWD, "/usr/lib/libGAL.so", O_RDONLY|O_CLOEXEC <unfinished ...>
[pid 204] ioctl(6, _IOC(_IOC_NONE, 0x75, 0x30, 0), 0xffffe1e7eaf8) = 0
[pid 204] ioctl(6, _IOC(_IOC_NONE, 0x75, 0x30, 0), 0xffffe1e7e8f8) = 0
[pid 205] openat(AT_FDCWD, "/lib/libGAL.so", O_RDONLY|O_CLOEXEC <unfinished ...>
[pid 204] ioctl(6, _IOC(_IOC_NONE, 0x75, 0x30, 0) <unfinished ...>
[pid 204] <... ioctl resumed>, 0xffffe1e7e908) = 0
[pid 205] ioctl(6, _IOC(_IOC_NONE, 0x75, 0x30, 0) <unfinished ...>
[pid 204] ioctl(6, _IOC(_IOC_NONE, 0x75, 0x30, 0), 0xffffe1e7ef18) = 0
[pid 204] ioctl(6, _IOC(_IOC_NONE, 0x75, 0x30, 0), 0xffffe1e7ef18) = 0
strace: Process 206 attached
[pid 206] ioctl(6, _IOC(_IOC_NONE, 0x75, 0x30, 0) <unfinished ...>
[pid 204] ioctl(6, _IOC(_IOC_NONE, 0x75, 0x30, 0), 0xffffe1e7ed28) = 0
[pid 204] openat(AT_FDCWD, "/etc/ld.so.cache", O_RDONLY|O_CLOEXEC) = 5
[pid 204] openat(AT_FDCWD, "/lib/aarch64-linux-gnu/libGLSLC.so", O_RDONLY|O_CLOEXEC) = 5
=======================================================
glmark2 2023.01
=======================================================
OpenGL Information
GL_VENDOR: Vivante Corporation
GL_RENDERER: Vivante GC7000XSVX
GL_VERSION: OpenGL ES 3.2 V6.4.3.p4.398061
Surface Config: buf=32 r=8 g=8 b=8 a=8 depth=24 stencil=0 samples=0
Surface Size: 800x600 windowed
=======================================================
[pid 204] ioctl(6, _IOC(_IOC_NONE, 0x75, 0x30, 0), 0xffffe1e7ee88) = 0
[pid 204] openat(AT_FDCWD, "/usr/share/glmark2/shaders/light-basic.vert", O_RDONLY) = 9
[pid 204] openat(AT_FDCWD, "/usr/share/glmark2/shaders/light-basic.frag", O_RDONLY) = 9
[pid 204] ioctl(6, _IOC(_IOC_NONE, 0x75, 0x30, 0), 0xffffe1e77338) = 0
[pid 204] openat(AT_FDCWD, "/usr/share/glmark2/models/horse.3ds", O_RDONLY) = 9
```

I've cleaned up the traces a bit to focus on what's important. To recap: inside our container there are a bunch of libraries that the application (`glmark2`) is using to talk to the hardware. Because we're using a Wayland compositor, the first GPU-related bit you see in the logs above is `libEGL`, which is spoken to by `libwayland-client`, which in turn links against `glmark2`. That's why this variant of `glmark2` has the `es2-wayland` appendage, which means it's targeted at the OpenGLES2 graphics API (provided by `libGLESv2` in the logs above and called by `libEGL`) and is specific to run on top of Wayland (explaining why it's calling `libwayland-client`, `libwayland-cursor` and `libwayland-egl` at the very beginning of the execution).

## Ok, it works, why?
Let's go back to the issues we had before and how we can overcome then:

- introduce the necessary userspace libraries in this containerized root filesystem

Here you have a couple of options: if your kernel driver portions are upstreamed, there's a really good chance that a project like `mesa` already supports it on the userspace side [^3], so if you use a distro that packages `mesa`, like Debian, you can simply install it and everything will be ready. Example of this are the `imx6` SoC, for example, which has pretty good driver support through the `etnaviv` project. Or some of the ARM Mali GPUs, which are nicely backed up by the open-source driver stack `panfrost` (most open-source drivers have cool names).

The sad part is, most of the embedded boards still don't support in mesa, and even if they do, there are key feature we just can't live without that are only present in the proprietary drivers or forks of mesa itself. 
If we take a look at the base container for `graphics-tests-vivante` we see it's `wayland-base-vivante`[^4]. Going into the Dockerfile for that, in turn, reveals that we install a certain `imx-gpu-viv-wayland` inside this container. This is the package that provides those libraries which we saw in the `strace` before, through our third-party Debian package feed.

If you wanna learn how the package is created, it's all done through GitHub Actions[^5]. If you build the package (or download through the GitHub Actions artifacts) you'll see the libraries we saw in the `strace` log before (shortened for brevity, there are lots of other libs):

```text
root@e2fa8ffdffe6:/packages# dpkg --contents imx-gpu-viv-wayland_6.4.3.p4.6-1_arm64.deb 
-rw-r--r-- root/root    366328 2022-11-13 09:39 ./usr/lib/aarch64-linux-gnu/libEGL.so.1.5.0
-rw-r--r-- root/root   3595088 2022-11-13 09:39 ./usr/lib/aarch64-linux-gnu/libGL.so.1.2.0
-rw-r--r-- root/root   1672016 2022-11-13 09:39 ./usr/lib/aarch64-linux-gnu/libGLESv2.so.2.0.0
-rw-r--r-- root/root   1205912 2022-11-13 09:39 ./usr/lib/aarch64-linux-gnu/libGLSLC.so
```

- somehow expose the device descriptors created by the drivers inside this container should be the same thing as simply running the applications in the "usual" root filesystem

Ok, now we know how the libs get into the container (a nicely packaged, signed, Debian package, through Toradex's feed), how do we allow these libraries to open the device descriptors created by the kernel side? Docker thankfully has a nice mechanism of modifying the rules when a given container starts, giving it more permissions to specific devices. When we ran the `graphics-tests-vivante` container, we passed some obscure flags `--device-cgroup-rule="c 4:* rmw" --device-cgroup-rule="c 13:* rmw" --device-cgroup-rule="c 199:* rmw" --device-cgroup-rule="c 226:* rmw" `. These are the major device nodes for a given hardware, and they describe which hardware is associate with which number. Passing these rules is saying "allow every device with major `{4, 13, 199, 226}`  and any minor to be read (`r`), allowed to create nodes (`m`) and to be written (`w`)".

If we take a look at the documentation[^6] for what the major numbers mean (it's standardized by the kernel) we can see that:

- `4` is for tty devices like `/dev/tty0`
- `13` is for input devices like `/dev/input`
- `226` is for the DRI (read, "GPU") devices, like `/dev/dri/card0`
- `199` is for ... `Veritas volume manager (VxVM) volumes`?

Ok, this is one of the first not-so-good things about these proprietary devices. `199` in our system is actually for a kernel module called `galcore`[^7], it doesn't necessarily respect what's set in the upstream, and maybe they had very good reasons to do it. I just don't know and it's trippy when you first see it.

Now everything works as if you were in the "real" root filesystem. Actually let's compare the performance, because I hope you can now see that it should, technically, just work the same as a traditional application deployment, outside the container, with no performance drop. There's not virtualization so to say occurring here, just isolation[^8], so not performance drop right?

## Benchmarking - the lack of - Performance Drop between Container and no Container

Running `glmark2` inside Torizon OS in the same manner we did above and using the Toradex BSP Reference Multimedia image (both installed with Toradex Easy Installer) takes seconds to test and we obtain these results:

| Containerized GLmark2 | Non-Containerized GLMark2 |
| --------------------- | ------------------------- |
| Score: 1664           | Score: 1661               |

Which is expected because, again, it's just a process with some fancy metadata to isolate it.

I hope this article was a fun read!


[^0]: Actually it will create images in the OCI format; a fancy, open format for container images.

[^1]: https://github.com/torizon/torizon-containers/blob/stable-rc/debian-docker-images/imx/graphics-tests-vivante/Dockerfile#L13

[^2]: Weston also runs inside the container, applying the same principles as the article describes; it's just another graphical application. To spawn it, run like this: \
{{< highlight text >}}
docker container run -e ACCEPT_FSL_EULA=1 -d
--name=weston --net=host --cap-add CAP_SYS_TTY_CONFIG
-v /dev:/dev -v /tmp:/tmp -v /run/udev/:/run/udev/
-v /tests/imx/weston/chromium/weston.ini --device-cgroup-rule="c 4:* rmw"
--device-cgroup-rule="c 13:* rmw" --device-cgroup-rule="c 199:* rmw"
--device-cgroup-rule="c 226:* rmw" --device-cgroup-rule="c 10:223 rmw"
torizon/weston-vivante:stable-rc --developer --tty=/dev/tty7 -- --debug
{{< / highlight >}}

[^3]: https://docs.mesa3d.org/systems.html

[^4]: https://github.com/torizon/torizon-containers/blob/stable-rc/.gitlab-ci.yml#L486

[^5]: https://github.com/torizon/imx-gpu-viv-deb

[^6]: https://www.kernel.org/doc/Documentation/admin-guide/devices.txt

[^7]: https://github.com/nxp-imx/linux-imx/blob/lf-6.6.y/drivers/mxc/gpu-viv/hal/os/linux/kernel/gc_hal_kernel_parameter.h#L472

[^8]: Hardware and Software Support for Virtualization by Bugnion might disagree in the academical sense, and that's true. It's technically "lightweight" virtualization, as virtualization is a technique, not a technology.
