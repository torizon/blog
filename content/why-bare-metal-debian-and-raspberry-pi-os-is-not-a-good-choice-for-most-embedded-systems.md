---
title: "Why bare-metal Debian (and Raspberry Pi OS) is not a good choice for most Embedded Systems"
date: 2024-07-01
author: Leonardo Held, Torizon Developer
draft: false

tags: ["Debian", "Yocto", "Container", "Embedded"]

abstract: It works until it doesn't.

image: /no-debian-in-my-fleet.png
---

Quite a few embedded vendors nowadays ship Debian or some derivative by default, specially for the hobbyist sector, but I don't think people realize that there isn't an expectation that Debian will be their *production* operating system, and when with 'production' I don't mean one or two devices: by all means, if that's your scale, continue using Debian in pet machines instead, that's very much fine.

The real issue arises when you need real scale like multiple thousands of devices per year, which is the scale most SoM/SBC vendors are working with. Let's go over some of the drawbacks you'll have to deal with running Debian with those devices.

### Hard to setup a reproducible environment
This is not a ode to tools like buildroot or Yocto, but the available Debian tooling to create a bit-to-bit rootfs like Yocto is not really suitable for embedded devices. The fundamental difference is that a Debian repository is, first and foremost, a rolling server to pull updates from. Meaning, if you want to update, you have to deal with the pain of actually pinning `apt` to a known good revision and get a master image out of that. This can work, but you'll find so much less ergonomic than the very explicit way buildroot or Yocto have - can't go wrong by fixing down to the git SHAs of each software composing your image.

### Debian is not immutable
Immutability (ie, updates are new snapshots applied on top of a read-only filesystem) is necessary to make sure you have the same revision in the lab as you have in the field, because if you think issues won't show up, they absolutely will. And sending out engineers out into the field or getting some boxes back into the office can be very, very expensive.
Debian... is not immutable (by default[^0]). 

So the strategy a lot of people take is: get a 'master', good revision image and use an A/B partition system to switch between revisions. That's generally ok and safe, but it's not very optimized for space. Most immutable distros rely on filesystem tree trackers like ostree, which can be much more efficient (having a single partition is pretty awesome).

Immutability is also pretty much a requisite for secure boot (chain-of-trust) implementations, because every link of the chain has to be cryptographically verifiable, and doing that with a changing root filesystem is impossible. In this case you need to go back to signing the 'master' or 'good' revisions, which comes with all the downsides we mentioned in the previous section.

And don't even think about relying on `apt` to issue updates. It's a moving target if you're not very, very careful and know exactly what you're doing *and* have the infrastructure to do so. Like my colleague Drew Moseley said "you gotta make sure you have the same bag of bits in every device". Naturally this also breaks secure boot because of the mutability aspect.

### Package Drift or 'how do I add package `x` to my image after 2 years of not updating?'
A lot of people that end up using Debian on the field but cannot manage the infrastructure get cornered in a situation where a package `x` needs to be installed or updated and alas, it needs new dependencies.

Then you get your good revision and try to install/compile the new `x` package and... it doesn't work! `unmet dependencies` and all of that... it's the nature of Debian, things move upstream together, at the same time. Mixing package feeds is a bad idea, and it might save a bit of time now, but we see this situation every week, customers really wishing they just had used something more appropriate from the get-go.

An addend that I'd like to make here: don't use `snapshot.debian.org`. I see a lot of companies deploying devices pinned to a good, known revision of the Debian archive using the snapshot services, but they quickly find out it's rate limited for a reason.

### Maintaining a secure package feed is hard work
Mostly CI/CD pipelining for the package builds and testing to make sure everything is correct (automated testing at any larger scale, which gets expensive very fast). Debian stable is pretty stable, and generally stuff doesn't break - and I would know I maintain feeds.toradex.com/debian and some others -, but that's because we spend significant of resources to test it every day; it's simply not economical for most medium-scale projects to do the same. And you will naturally need a package feed to keep your own `.deb` artifacts stored, which is not as simple to setup as say, a Docker Registry, and for sure not as safe.

### Hardware support is not that great
If you're not familiar with the hurdles the Asahi team is going on to upstream Apple Silicon support to the kernel, it's a lot. Now take that effort and multiply for each of the different SoC families, variations, embedded GPUs, NPUs, audio drivers, bluetooth and WiFi drivers: that's what you'll be dealing with if you're trying to run upstream Debian.
With that said, you can package an Evil Vendor Kernel[^1]  kernel, probably your own GL stuff as well and for sure any vendor OpenCV or GStreamer implementations. And pray it plays nicely with the upstream feeds[^2]!

## Conclusion and Alternative
From first-hand experience with customers, we learned that most of them don't really can nor should care about this whole infrastructure (in the same vein as 'don't write your own database', don't deploy your own OTA infrastructure). The *application*, the *solution* is what matters, and right now without some hard-earned expertise and maybe a lot of time to setup Debian for an embedded fleet, I can't really recommend it.

{{< figure src="/with-debian.png" title="OS Stack with Debian" alt="an approach to architect an embedded system with Debian" width="70%" class="centered-figure">}}

What do I recommend, instead? Our approach, naturally! This is not a sponsor-block, please don't read it like this, it's just a fairly mature, well-tested strategy: a Yocto-built, minimal and lean OS with Debian Containers on top, which is what we did on Torizon[^3]. None of the drawbacks, pretty much all of the positives from both worlds. A middle-ground, so to say, that won't make your head explode with either learning Yocto nor trying to understand the - honestly - arcane Debian Packaging toolset [^4].

{{< figure src="/with-mixed-approach.png" title="OS Stack with Mixed Approach" alt="another approach to setup an embedded system with Debian, but using containers and an immutable base OS instead" width="70%" class="centered-figure">}}

[^0]: Some projects like apt2ostree look very promising, though!
[^1]: Any downstream kernel that never gets upstreamed, ever.
[^2]: And don't even think of shipping an insecure rootfs like Debian testing, that is not watched by the security team: that will get you into trouble with things like the Cyber Resilience Act.
[^3]: This article is more like the *why*, learn more about some portions of the *how* here: https://torizon.github.io/blog/how-does-hardware-acceleration-work-with-containers/
[^4]: And learn more about our offerings here: https://developer.toradex.com/torizon/provided-containers/debian-containers-for-torizon
