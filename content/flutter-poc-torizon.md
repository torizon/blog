---
title: "Flutter on Torizon - A PoC Setup for i.MX 8M Plus"
date: 2022-03-10
author: Lars König (Crossware.io), CEO and Founder & Ravi Shekdar (Crossware.io), CTO
draft: false

tags: ["GUI", "Container"]

abstract: For some time already, Flutter has been quite successful as a native HMI and Application technology on the Web, Mobile Phones, and even for Desktop.

image: https://docs.toradex.com/110479-flutter-application-bundle-creation-1.png
---

## Overview

For some time already, Flutter has been quite successful as a native HMI and Application technology on the Web, Mobile Phones, and even for Desktop. Developers love the programming language, its performance, and the outstanding feature richness (e.g., the ability to create performant and custom animations of any complexity). It is extensively used by Google internally. Moreover, with its attractive BSD license, it has been used by many independent software development vendors meanwhile.

Embedded Systems are not yet officially supported although we have seen activities (e.g., Sony and Canonical) promoting Flutter as a viable option in the embedded space.

But there is nothing like making your own experience on technology to understand the capabilities and boundaries. Crossware, as a Toradex partner, decided to invest in a Flutter PoC on a i.MX 8M Plus and use a Torizon container.

We have gone through the exercise and would like to share the experience we had and some observations:

- We will describe the Flutter Architecture for a basic understanding of the technology
- We will show you how to create a Flutter Application Bundle for our Internet Music Player Demo
- Then we will describe steps to containerize the Application Bundle including all steps to get Torizon on i.MX 8M Plus running

We have added the details in specific sections and a link to the sources so you can easily create a similar setup.

## Flutter Architecture

As in many architectures, the code structure of Flutter is divided into applications specific code, common source files and platform-specific adaption:

{{< figure src="https://docs.toradex.com/110478-flutter-architecture.png" title="Flutter Architecture" >}}

The platform-specific adaption, the embedder, is the layer of interest for us for which different implementations for Linux exist. To not make a wrong choice, we’ve had a closer look into both executions; Meta-Flutter and eLinux. We have been able to implement both embedders on our target hardware (Verdin i.MX 8M Plus) with a Torizon environment. Our experience was that both implementations performed equally, but eLinux was much easier to set up than Meta-Flutter. For this reason, we decided to skip Meta-Flutter and work with eLinux only.

## Flutter - Creating An Application Bundle

As the foundation for the Flutter application we used an Internet Radio Demo utilizing gStreamer for the audio playback:

{{< figure src="https://docs.toradex.com/110479-flutter-application-bundle-creation-1.png" title="Flutter Application - Internet Radio Demo" >}}

{{< figure src="https://docs.toradex.com/110480-flutter-application-bundle-creation-2.png" title="Flutter Application - Internet Radio Demo" >}}

As a side note, the same Flutter application we ported to the web, and have also once created a Qt and Qt-for-MCU version from it (please reach out to us if you’d like to learn more ).

We intended to create a container for a Verdin-iMX8M Plus version 1.1A board. For the host environment, we chose Ubuntu (20.04 + Docker version 20.10.7, build 20.10.7-0ubuntu1~20.04.2).

To set up the build environment, follow the steps recommended by Toradex: https://developer.toradex.com/knowledge-base/configure-buildenvironment- for-torizon-containers.

To compile the Flutter Internet Radio Demo and GStreamer for the container, see the overview and the detailed steps to expand below:

{{< figure src="https://docs.toradex.com/110791-flutter-internet-radio-demo-and-gstreamer-for-the-container.jpg" title="Flutter Internet Radio Demo and GStreamer for the container" >}}

Create the Docker image with Flutter build environment
Verify the Image created with build environment

```bash
host$ docker images
REPOSITORY         TAG    IMAGE ID      CREATED           SIZE
flutter_build_env  1      123456abcd    3 minutes ago     3.2GB
```

Run the image to create Flutter application bundle by providing the application absolute path

```bash
host$ docker run --rm -v /flutter_new_internetradio:
/InternetRadio flutter_build_env:1
```

On successful compilation, bundle folder is created under the application folder:
flutter_new_internetradio/build/elinux/arm64/debug/bundle.
Copy this folder to Flutter_torizon folder.

## Torizon Container - Create And Get Them Onto the Hardware

Now that we have created the Flutter Application Bundle, we need to set up Torizon and the respective containers. We’ll need two containers for our scenario: one with our Flutter Application Bundle, including GStreamer, and a second providing Wayland as a resource. See the image for all necessary steps:

{{< figure src="https://docs.toradex.com/110485-torizon-container-creation.png" title="Torizon Container Creation" >}}

To run the Flutter Internet radio example, GStreamer and tool support are required. Again, if you'd like details, please expand the sections below.

Preparing the Container
Copy the Flutter_torizon folder to Host machine

The folder contains the below files/folders

- bundle (folder) => Crossware Flutter Internet Radio application
- Dockerfile => Docker script to create required Docker image
- docker_compose_flutter.yaml => docker composer which runs multiple docker images

The Dockerfile appears as presented:

```Dockerfile
ARG BASE_NAME=weston-vivante
ARG IMAGE_ARCH=linux/arm64/v8
ARG IMAGE_TAG=2
ARG DOCKER_REGISTRY=torizon

FROM --platform=$IMAGE_ARCH $DOCKER_REGISTRY/$BASE_NAME:$IMAGE_TAG
ARG IMAGE_ARCH
RUN mkdir -p /app/radio

RUN apt-get -y update && apt-get install -y \
         alsa-utils \
         psmisc \
         libgstreamer1.0-0 \
         gstreamer1.0-plugins-base \
         gstreamer1.0-plugins-good \
         gstreamer1.0-plugins-bad \
         gstreamer1.0-plugins-ugly \
         gstreamer1.0-libav \
         gstreamer1.0-doc \
         gstreamer1.0-tools \
         gstreamer1.0-x \
         gstreamer1.0-alsa \
         gstreamer1.0-gl \
         gstreamer1.0-gtk3 \
         gstreamer1.0-pulseaudio

ADD bundle /app/radio/

WORKDIR /app/radio/
ENV PATH="/app/radio:${PATH}"

ENTRYPOINT ["flutter_new_internetradio"]
CMD [ "-f", "-b", "/app/radio"]
```

Copy folder Flutter_torizon to Host machine and change directory to it.

```bash
host$ //Flutter_torizon$ ls
bundle docker_compose_flutter.yaml Dockerfile
```

Build Docker Image with below command

```bash
host$ docker build --no-cache -t : .
ex:
host$ docker build --no-cache -t flutter_test:radio .
```

Verify the build image with below command

```bash
host$ //Flutter_torizon$ docker images
REPOSITORY    TAG    IMAGE ID     CREATED                SIZE
flutter_test  radio  cc4444444    About a minute ago     881MB
```

Now the image “flutter_test:radio” is ready
Save image to .tar file

```bash
host$ docker save : > ./.tar
ex:
host$ docker save flutter_test:radio > ./flutter_test_radio.tar
```

Copy created tar image to Target (iMX8MP-Verdin)
Make sure target is up and running

```bash
host$ scp .tar torizon@:/home/torizon/
ex:
host$ scp flutter_test_radio.tar torizon@192.168.0.1:/home/torizon/
```

Update the image name in docker_compose_flutter.yaml file line number 47 with the image created

{{< figure src="https://docs.toradex.com/110790-docker-compose-flutter.jpg" title="Docker Compose Flutter" >}}

Copy docker_compose_flutter.yaml to Target
Make sure target is up and running

```bash
host$ scp docker_compose_flutter.yaml torizon@192.168.0.1:/home
/torizon/
```

Running the Container
Boot the target with Torizon Core software and login into it using SSH
Change directory to “/home/torizon”

```bash
target# cd /home/torizon
target# ls

ex:
verdin-imx8mp-1234:~$ ls
docker_compose_flutter.yaml flutter_test_radio.tar
```

Load .tar file as docker image and verify

```bash
target# docker load < image-any-name.tar
ex:
verdin-imx8mp-1234:~$ docker load < flutter_test_radio.tar
...........
Loaded image: flutter_test:radio
target# docker images
ex:
verdin-imx8mp-1234:~$ docker images
REPOSITORY              TAG        IMAGE ID          CREATED         SIZE
flutter_test            radio      c0000000005       1 hours ago     881MB
torizon/weston          2          b0000000000       5 weeks ago     305MB
torizon/weston-vivante  2          099999999dc       5 weeks ago     424MB
```

Stop all running images/containers and confirm ad below

```bash
target# docker stop $(docker ps -a -q)
target# docker ps
```

Now run docker-compose with yaml file as argument
This below command will run two images torizon/weston-vivante:2 and flutter_test:radio

```bash
target# docker-compose -f docker_compose_flutter.yaml up
```

Running images can be viewed on target (on another ssh terminal) using below command

```bash
verdin-imx8mp-1234:~$ docker ps
CONTAINER ID        IMAGE                         COMMAND
300000006           flutter_test:radio            "flutter_new_interne…"
100000003           torizon/weston-vivante:2      "/usr/bin/entry.sh -…"
verdin-imx8mp-1234:~$
```

On successful running, the Flutter Radio application will run on target

{{< figure src="https://docs.toradex.com/110479-flutter-application-bundle-creation-1.png" title="Crossware Internet Radio Application" >}}

## Conclusion - For Whom Is It Good?

Our exercise has shown that Flutter on Embedded is surprisingly less of a hurdle if you have some base expertise in Embedded Systems.

Regarding performance KPIs, we haven’t done any dedicated analysis yet. For a later publication, we plan to look into the performance KPIs and optimize the setup if possible. Considering Flutter for any serious product usage, all performance and footprint requirements need to be benchmarked thoroughly.

Still, the following question remains: For whom is Flutter a good Embedded Systems choice?

There are two types of customers who can benefit from such a setup.

First, if you formerly have developed mainly Flutter applications for mobile or web and hence your developer workforce is familiar with Flutter, Flutter for embedded might be a good option.

Second, if your envisioned product includes a Mobile/Web/Embedded System and if you plan frequent updates for this eco-system including the same single-source code base, then Flutter might be a good option as well. Even if your workforce isn’t so familiar with Flutter, it would be less of a problem since the Flutter Developer Experience is known to be excellent. If you give your developers some time, they’ll pick up it quickly and be productive pretty fast.

For both cases, having Toradex as the hardware vendor and Torizon for the infrastructure, you would have a great foundation to start your next Embedded Project. If you have any questions, feel free to reach out to Crossware.