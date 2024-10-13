---
title: "What are the Differences Between Torizon and CommonTorizon Container Images?"
date: 2024-10-08
author: Matheus Castello, Torizon Developer
userId: 2633321
draft: false

tags: [ "Container", "Linux", "Embedded","Torizon" ]

abstract: "This blog post describe the main differences between the Torizon and CommonTorizon experimental container images."

customCSS: /css/fixedtable.css
image: /torizon-commontorizon-containers-main.jpg
ogImage: ../og-castello-torizon-commontorizon-containers.jpg
---

Within the Torizon ecosystem we also have Common Torizon. Common Torizon is a community driven derivative work from Torizon open source project. It aims to extend the Torizon ecosystem beyond Toradex SoMs. Therefore, it was also necessary to create container images that were compatible with the hardware that is the target of Common Torizon. This was the **main motivation** for creating the Common Torizon container images.

![](/torizon-commontorizon-containers-main.jpg)

Despite the main motivation, an additional opportunity was identified, to provide more flexibility and power to the community of the Torizon ecosystem, who could extend the functionalities of Torizon container images to meet their specific needs in an experimental way.

## Debian Base Images

![](/debian-container.jpg)

The base, the origin, of all Torizon container images is from Debian. Debian is stable, contains a huge number of packages and is very well supported. It also has portability for different architectures. Therefore, it is a natural and safe choice for container image foundation.

## Torizon / Common Torizon Base Images

Why Torizon images? Why not only use Debian images? Being very simplistic, Torizon images are Debian images with a touch of a special sauce. There is a team at Torizon group that works to package the Toradex specific software for their respective hardware. This includes drivers, libraries, and tools that are necessary to make the hardware work properly, within Debian, that are not present in the upstream package feed. This is the main difference between Torizon and Debian images. There is also a need to apply some patch or optimization to some package, so that it works correctly in an embedded system environment. Bearing in mind that Debian is mostly used for desktop and server systems, the packages are not always prepared for a different environment. So, Toradex provide a [package feed](https://feeds.toradex.com/debian/) that is used to install the custom, patched and hardware specific packages, and their respective dependencies. This feed is included in Torizon images. In addition to the packages, there are some configurations included in the Torizon images, so that application development is as integrated and easy as possible when working together with Torizon OS.

Comparing with Common Torizon images there is no much difference here. The Common Torizon images uses the Torizon images as a base, they are already configured for work with Torizon OS that is the same base for Common Torizon OS.

The images are:

| Torizon | Common Torizon |
| ------- | -------------- |
| torizon/debian | commontorizon/debian |
| torizon/debian-vivante | commontorizon/debian-imx8 |
| torizon/debian-imx8 | commontorizon/debian-imx8 |
| torizon/debian-am62 | commontorizon/debian-am62 |

### Hardware Specific Images

Why are there `-vivante`, `-imx8` and `-am62` images? These images are hardware specific images. They contain the necessary drivers and configurations for the hardware that is the target of the image. The `-vivante` and `-imx8` images are for the NXP i.MX 8 based hardware. The `-am62` image is for the Texas Instruments AM62 based  hardware.

> ⚠️ The `-vivante` is a legacy name that was used in the past for the i.MX 8 target images. These are still used for integration with TOS 5 and 6. But for TOS 7 forward, the `-imx8` is the new name for the i.MX 8 target images.

![](https://docs.toradex.com/111854-toradex-module-hand.png)

So, why there is no `-rpi` image variant from the Common Torizon side, to handle Raspberry Pi specific based hardware? Because Raspberry Pi hardware works out of the box within Debian and the upstream package feed. So in this case the image to be used is the default `commontorizon/debian`.

Next question: if the images here are basically the same, why then have `torizon/debian` and `commontorizon/debian`? Toradex Torizon team started publishing images with support for `x86_64`, a Common Torizon target hardware, only now in version `4.x.x`. So that the end user did not need to change repositories and could have access to all architectures in a single namespace and version, `commontorizon/debian` was also created.

## Torizon Application Containers

There is also a set of container images, that are provided by Toradex, that are intended to be used as a base for application containers. They are also available in the [Toradex Docker Hub](https://hub.docker.com/u/toradex) repository. Let's describe them in sections.

### Graphical Application Base and Graphical Compositor

![](/wayland-weston.png)

These images are intended to be used as a base for graphical applications. They contain the necessary libraries and tools to run graphical applications, when using a specific graphical compositor:

| Torizon | Common Torizon |
| ------- | -------------- |
| torizon/wayland-base | commontorizon/wayland-base |
| torizon/wayland-base-vivante | commontorizon/wayland-base-imx8 |
| torizon/wayland-base-imx8 | commontorizon/wayland-base-imx8 |
| torizon/wayland-base-am62 | commontorizon/wayland-base-am62 |
| torizon/weston | commontorizon/weston |
| torizon/weston-vivante | commontorizon/weston-imx8 |
| torizon/weston-imx8 | commontorizon/weston-imx8 |
| torizon/weston-am62 | commontorizon/weston-am62 |

These  are very pretty the same images between Torizon and Common Torizon. Previously the `torizon/weston` had Weston package built to work with `libseat` support only for the i.MX 8 `torizon/weston-vivante` and `torizon/weston-am62` images. So, to the Weston work properly on Common Torizon target was needed to change the `commontorizon/weston` with the Weston packages built with `libseat` support. But now, version `4.x.x`forward, the `torizon/weston` images have also the Weston package built with `libseat` support.

#### Common Torizon Graphical Additional Images

![](/xfce-x11.png)

At the Common Torizon side, for the graphical applications, there are some additional images that are not present in the Torizon side. These images add some experimental features like:

| Image             | Feature |
| --------------- | -------------- |
| commontorizon/xfce | X11 desktop environment configured to be used in kiosk mode |
| commontorizon/x-base | Base image for X11 applications |

### Graphical Application Base Framework Specific

![](/dotnet-qt-gtk2.png)

There is also a set of images that are intended to be used as a base for graphical applications that are based on a specific frameworks. This way the developer can easy start a project using a specific framework:

| Torizon | Common Torizon |
| ------- | -------------- |
| torizon/qt5-wayland | commontorizon/qt5-wayland |
| torizon/qt5-wayland-vivante | commontorizon/qt5-wayland-imx8 |
| torizon/qt5-wayland-imx8 | commontorizon/qt5-wayland-imx8 |
| torizon/qt5-wayland-am62 | commontorizon/qt5-wayland-am62 |
| torizon/qt6-wayland | commontorizon/qt6-wayland |
| torizon/qt6-wayland-vivante | commontorizon/qt6-wayland-imx8 |
| torizon/qt6-wayland-imx8 | commontorizon/qt6-wayland-imx8 |
| torizon/qt6-wayland-am62 | commontorizon/qt6-wayland-am62 |
| torizon/wayland-gtk3 | commontorizon/wayland-base-gtk |
| torizon/wayland-gtk3-imx8 | commontorizon/wayland-base-gtk-imx8 |
| torizon/wayland-gtk3-am62 | commontorizon/wayland-base-gtk-am62 |

These are all pretty similar images, no changes, again to maintain the single namespace for all architectures. Only the `commontorizon/wayland-base-gtk` which has significant changes, it adds support for Wayland text input v1 for GTK applications, that is not included in the Torizon side.

But there are others that are similar variants, but they use different base images:

| Torizon | Common Torizon |
| ------- | -------------- |
| torizon/dotnet8-gtk3 | commontorizon/dotnet-gtk |
| torizon/dotnet8-gtk3-imx8 | commontorizon/dotnet-gtk-imx8 |
| torizon/dotnet8-gtk3-am62 | commontorizon/dotnet-gtk-am62 |

> ⚠️ From the Common Torizon side the `commontorizon/dotnet-gtk` uses the `commontorizon/wayland-base-gtk` as a base image, to inherit the Wayland text input v1 support.

#### Common Torizon Graphical App Framework Specific Additional Images

Also the Common Torizon includes the variants with the `vsdgb` for .NET GTK:

| Image             | Feature |
| --------------- | -------------- |
| commontorizon/dotnet-gtk-debug | .NET GTK application with Visual Studio Debugger support |
| commontorizon/dotnet-gtk-debug-imx8 | .NET GTK application with Visual Studio Debugger support for i.MX 8 hardware target |
| commontorizon/dotnet-gtk-debug-am62 | .NET GTK application with Visual Studio Debugger support for TI AM62  hardware target |

There are also .NET images for GTK that uses the `commontorizon/x-base` as a base image:

| Image             | Feature |
| --------------- | -------------- |
| commontorizon/dotnet-x-gtk | .NET GTK application with X11 support |
| commontorizon/dotnet-x-gtk-debug | .NET GTK application with X11 support and Visual Studio Debugger support |

![](/dotnet-mono.png)

Continuing with the .NET images, there are also the .NET images for WinForms that uses the Mono runtime:

| Image             | Feature |
| --------------- | -------------- |
| commontorizon/mono-sdk | .NET Mono image with all the tooling to build .NET WinForms v4.x applications |
| commontorizon/mono-sdk-imx8 | .NET Mono image with all the tooling to build .NET WinForms v4.x applications for i.MX 8 hardware target |
| commontorizon/mono-sdk-am62 | .NET Mono image with all the tooling to build .NET WinForms v4.x applications for TI AM62 hardware target |
| commontorizon/mono-runtime | .NET Mono image with all the dependencies to run .NET WinForms v4.x applications |
| commontorizon/mono-runtime-imx8 | .NET Mono image with all the dependencies to run .NET WinForms v4.x applications for i.MX 8 hardware target |
| commontorizon/mono-runtime-am62 | .NET Mono image with all the dependencies to run .NET WinForms v4.x applications for TI AM62 hardware target |

![](/slint-logo.png)

From the Common Torizon side we also are open to the community and Toradex partners to add their specific images. This is the case from Slint images. Essas imagens são um trabalho em conjunto entre o time do Slint para que usuários do ecosistema Torizon tenham uma melhor experiência de desenvolvimento ao utilizar o Slint:

| Image             | Feature |
| --------------- | -------------- |
| commontorizon/slint-sdk-amd64 | Image with all the dependencies and tooling to cross compile Slint applications for x86-64 architecture |
| commontorizon/slint-sdk-arm | Image with all the dependencies and tooling to cross compile Slint applications for armv7 architecture |
| commontorizon/slint-sdk-arm64 | Image with all the dependencies and tooling to cross compile Slint applications for armv8 architecture |
| commontorizon/slint-base-amd64 | Base image for Slint applications for x86-64 architecture |
| commontorizon/slint-base-arm | Base image for Slint applications for armv7 architecture |
| commontorizon/slint-base-arm64 | Base image for Slint applications for armv8 architecture |
| commontorizon/slint-base-arm64-vivante | Base image for Slint applications for armv8 architecture and i.MX 8 hardware target |
| commontorizon/slint-base-arm64-imx8 | Base image for Slint applications for armv8 architecture and i.MX 8 hardware target |
| commontorizon/slint-base-arm64-am62 | Base image for Slint applications for armv8 architecture and TI AM62 hardware target |

Why these kind of images are important? When the developer is starting a project is much easier to start from a base image that already contains all the necessary dependencies, and was pre-built, than start from scratch. This way the developer can save time and focus on the application development.

![](/gambas-vb.png)

And finishing this section, there are also the Gambas 3 images:

| Image             | Feature |
| --------------- | -------------- |
| commontorizon/gambas3 | Image for use with Gambas3 applications |
| commontorizon/gambas3-imx8 | Image for use with Gambas3 applications for i.MX 8 hardware target |
| commontorizon/gambas3-am62 | Image for use with Gambas3 applications for TI AM62 hardware target |

Gambas is a free development environment based on a Basic interpreter with object extensions, like Visual Basic. It is inspired by Visual Basic and Java. With Gambas, you can quickly design your program GUI, and the tooling recall a lot the way of developing desktop applications with Visual Basic 6. VB6 was one of the first languages and frameworks that I used when I was starting my career as a developer, so I have a special affection for it.

### Web Based Applications

![](/cog-chromium.png)

There are images that are intended to be used as a base for web based applications. There are images with browser support and framework specific images:

| Torizon | Common Torizon |
| ------- | -------------- |
| torizon/chromium | N/A |
| torizon/chromium-imx8 | N/A |
| torizon/chromium-am62 | N/A |
| torizon/cog | commontorizon/cog |
| torizon/cog-imx8 | commontorizon/cog-imx8 |
| torizon/cog-am62 | commontorizon/cog-am62 |

> ⚠️ The Common Torizon COG images are pretty similar to the Torizon COG  images, but they add a difference: the container `entrypoint` was significantly customized, it provide a mechanism to wait for a server to be ready. This is useful when the developer is working with a multi-container application that has a server and a client, and the server needs to be ready before the client starts.

> ⚠️ The Chromium images are not available from the Common Torizon side, because until today was not necessary to have it. From my experiments the COG had a better performance than Chromium.

#### Framework Specific Web Based Applications

There are also images that are intended to be used as a base for web based applications that are based on a specific frameworks:

| Torizon | Common Torizon |
| ------- | -------------- |
| torizon/aspdotnet | commontorizon/aspdotnet |
| torizon/aspdotnet8 | commontorizon/aspdotnet |
| torizon/aspdotnet8-imx8 | N/A |
| torizon/aspdotnet8-am62 | N/A |
| torizon/aspdotnet-debug | commontorizon/aspdotnet-debug |

These are pretty similar images, the only differences is the specific hardware ones that are not available from the Common Torizon side. On my point of view is not necessary to have these images since the ASP.NET does not use anything hardware specific in the "server" side, like GPU acceleration. (but I can be wrong 😝)

## Tooling

![](/torizon-tooling.png)

There are also images that are intended to be used as  development tooling. Is much easier have the tooling packaged in a container image than install all the dependencies and configure the environment:

|  Common Torizon | Torizon |
| ------- | -------------- |
| commontorizon/debian-cross-toolchain-amd64 | torizon/debian-cross-toolchain-amd64 |
| commontorizon/debian-cross-toolchain-arm64 | torizon/debian-cross-toolchain-arm64 |
| commontorizon/debian-cross-toolchain-arm64| torizon/debian-cross-toolchain-arm64-vivante |
| commontorizon/debian-cross-toolchain-arm64 | torizon/debian-cross-toolchain-arm64-imx8 |
| commontorizon/debian-cross-toolchain-arm | torizon/debian-cross-toolchain-arm |
| commontorizon/cross-toolchain-arm64 | torizon/cross-toolchain-arm64 |
| commontorizon/cross-toolchain-arm | torizon/cross-toolchain-arm |
| commontorizon/cross-toolchain-amd64 | N/A |
| N/A | torizon/torizoncore-builder |
| commontorizon/binfmt | torizon/binfmt |

These are pretty similar images, again they are added to the Common Torizon side to provide a single namespace for all architectures.

> ⚠️ The `commontorizon/binfmt` from the Common Torizon has significant changes, it adds support for the `arm64` and `arm` architecture and also uses the latest stable `qemu-system` binaries.

### Common Torizon Tooling Additional Images

The additional images from the Common Torizon side are:

| Image             | Feature |
| --------------- | -------------- |
| commontorizon/tcb-dev | Experimental builds of TorizonCore Builder with features specific for Common Torizon |
| commontorizon/deb-builder | Image with all the dependencies to build Debian packages |
| commontorizon/bsp-builder | Image with all the dependencies to build BSPs (bootloader/kernel) |
| commontorizon/torizon-yocto-github-runner | Image with all the dependencies to run a GitHub runner for Torizon Yocto Builder |
| commontorizon/torizon-dev | Image for the Torizon IDE CLI tool `torizon-dev` |
| commontorizon/torizon-dev-tasks | Image with all dependencies to be possible to run Torizon IDE tasks from CI/CD CLI |
| commontorizon/pwsh-gitlab | Image to add support to write scripts to the Gitlab CI/CD yaml file |

## Conclusion

Yes, this post was longer than I would have liked, but I'm happy to share these differences and their motivations with you. Common Torizon images are not intended to compete with Torizon images, but rather to be complementary. They would not exist without the work of the Torizon containers and packages team. The idea is to have a more flexible organization so that the community can experiment and extend the functionality of Torizon images to meet their specific needs. With the feedback based in the experiments, the Torizon team can improve the Torizon images and provide a better experience for the community.

I hope you liked the post and that it was useful to you. If you have any questions or suggestions, please do not hesitate to contact me. Until next time!
