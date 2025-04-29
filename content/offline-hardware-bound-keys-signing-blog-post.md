# How to sign Uptane metadata using offline keys from a hardware module?

Our Uptane implementation offers support for using hardware modules for offline keys, such as a Yubikey. I tried
using this feature, and it proved to be a bit tough to figure out. The documentation available is not as clear as it
should be, and `uptane-sign --help` also does not give clear explanations about this. To help with this, I'm writing
this post to document my experience and give future users of this feature a walkthrough.

## Overview

The Toradex OTA client supports RSASSA-PSS and ED25519 signatures.  However, using these external signatures can be a bit
confusing. This article will explain how to generate and use both of these signatures for the targets metadata as part
of the Torizon OTA client flow. If you wish to skip the detailed explanation of each step and only want to view the
commands involved, you can skip to [this TLDR section](#tldr).

## The Process

The instructions in the Toradex Developer docs on using [Offline Signing Keys](https://developer.toradex.com/torizon/torizon-platform/torizon-updates/offline-signing-keys/)
explains what should be done to take your keys offline and use them to carry out actions related to Torizon Cloud and
OTA updates. Here are the steps to summarize:

1. Create a local Uptane metadata repository: `$ uptane-sign init --repo myimagerepo --credentials /path/to/credentials.zip`
2. Generate/import new signing keys: 
   * `$ uptane-sign key generate --repo myimagerepo --name myroot --type ed25519`
   * `$ uptane-sign key generate --repo myimagerepo --name mytargets --type ed25519`
3. Perform the key rotation: `$ uptane-sign move-offline --repo myimagerepo --old-root-alias origroot --new-root myroot --new-targets mytargets`
   * Be careful to store your original root keys. Once you run this command, those keys will be wiped from the Torizon
   Cloud server and if you delete them locally as well, they cannot be recovered.
4. Pull the metadata from the Torizon cloud repository to local repository: `$ uptane-sign targets pull --repo myimagerepo`

These are the basic steps for setting up your local repository.

This is the part where things get tricky. So far, we've managed to bring the repository offline. We don't know yet how
to use the Yubikey along with these keys. 

## Yubikey 101

Yubikeys (and other hardware modules) have **slots**, which are used to hold different keys and certificates that can be
accessed and used for different purposes. Yubikey 5, for example, has 24 slots, such as 9a (used for PIV authentication),
9c (used for digital signatures), 9d (key management), etc. For our purpose of signing our data, we will be using slot
9c.

Setting up a Yubikey includes setting a PIN and a Management key. That can easily be done through their GUI on the
[Yubikey Manager](https://www.yubico.com/support/download/yubikey-manager/) app, available for Linux, macOS and Windows.

Once this initial setup is complete, we move on to the juicy bits - generating the keys and signing.

## ED25519 signatures

For generating the keys, I used the PIV tool built by Yubico, called `$ yubico-piv-tool`. It can be built using package
managers like Homebrew or by simply cloning the source repository and building it. 

The steps for key generation are:
1. `$ yubico-piv-tool -a generate -s 9c -A ED25519 -k -o uptane-signing-key-ed25519.pem`
2. `$ yubico-piv-tool -a verify-pin -a selfsign -s 9c -S '/CN=piv_auth/OU=test/O=example.com/' -i uptane-signing-key-ed25519.pem`
    This will generate and print a self-signed certificate to stdout. Copy this certificate (including the headers) for 
    the next step.
3. `$ yubico-piv-tool -a import-certificate -s 9c -k`
    This will prompt you to paste/enter the certificate contents so that it can be safely imported in the slot.

Great! Now that the ED25519 key is properly set up and the certificate has been imported in slot 9c, we need to add
this key information to our TUF repository. TUF defines a specific way of storing key information, and luckily for us,
uptane-sign provides the functionality to do that automatically.

To add the public key associated with slot 9c on our Yubikey (let's call it uptane-signing-key-ed25519), run:
`$ uptane-sign user-keys importpub -k uptane-signing-key-ed25519 -i uptane-signing-key-ed25519.pem`. This will store the key in the format:

```json
{
  "keyval": {
    "public": "fa16s0m3k3y7alue397e83281004t0rad3x49555bd20b746d0d4c37c15981cda"
  },
  "keytype": "ED25519"
}
```

Once this key is imported into the repository, we must add it as a key that is authorized to sign Targets metadata. This
includes changing root metadata, signing the updated root metadata and pushing it to the Torizon Cloud server.
We can do this through uptane-sign by running:
1. `$ uptane-sign root targets-key add -k uptane-signing-key-ed25519 --repo myimagerepo`
2. `$ uptane-sign root sign -k origroot --repo myimagerepo` (`origroot` is the registered root on the server currently.
    After we push the new root metadata, we should use `myroot`.) 
3. `$ uptane-sign root push --repo myimagerepo`

Now, the Torizon Cloud server is up-to-date with knowledge of the new key authorized to sign targets metadata, and of
the new root key (myroot).

An important part of signing in Uptane is monotonically increasing the version number of the metadata file. This step is
very important and is required for ensuring protection against rollback attacks. We can increment the targets metadata
version number by running:

`$ uptane-sign targets increment-version --repo myimagerepo` 

Do not forget to do this before signing, as the server will reject targets metadata with equal version numbers. 

Signing the data is possible through the yubico-piv-tool itself. However, there is one step we should do _before_
signing. We have to **canonicalize** our target JSON before signing. This is because uptane-sign canonicalizes the JSON
object to ensure consistency before signing. The "canonical JSON" format is designed to provide repeatable hashes of
JSON-encoded data. Thus, if we forget to do this, our signature will never get verified successfully! We will,
effectively, be attempting to verify the contents of two _different_ files (canonicalized vs not).

To canonicalize the unsigned targets metadata, we run this Python script through the command line:
```shell
$ python3 -c "import json;import sys;sys.stdout.write(json.dumps(json.load(open('tuf/myimagerepo/roles/unsigned/targets.json','r')),separators=(',',':'),sort_keys=True,ensure_ascii=False,allow_nan=False));" > canonicalized_targets.json
```

This will save the canonicalized JSON in your PWD. The important (and generally confusing part of this process) is
(thankfully) over!

Now, we must generate the signature for this canonicalized JSON. We do this by running:

`$ yubico-piv-tool -a verify-pin --sign -s 9c -H SHA256 -A ED25519 -i canonicalized_targets.json -o targets_signed.sig`

The output of the above command is going to be a binary file, but uptane-sign expects the signature of the file to be
a base64 encoded string. Thus, to make uptane-sign happy we should convert string to a base64 string. This can easily
be done by running `$ base64 -i targets_signed.sig -o targets_signed_base64.sig`

Now that we have the signature ready, it's time to add it to our unsigned metadata and convert it to a signed document.
To do it automatically through uptane-sign, run the following command:

`$ uptane-sign targets sign --signatures uptane-signing-key-ed25519=$(cat targets_signed_base64.sig | tr -d '\n') --repo myimagerepo`

**What is `tr -d '\n'`?** This line is necessary because the string representation of the base64 encoded file will often
have a `\n` appended at the end of the string, which will cause errors during signature verification.

This command will automatically edit the file under `$ tuf/myimagerepo/roles/targets.json` with the updated version number,
verify and add the passed in signature along with the keyid. The resulting signature field will look like this:

```json
{
  "signatures": [
    {
      "keyid": "72d02bceaa7ecd41679bb270ce0c42d11376aff966becf8fb854e78baef87111",
      "method": "ed25519",
      "sig": "F98QebeTw+Ya3jbYVWCBQ3kxILla/c0dUdeto9EKOtQDWs36xS/1tsWHQVe3TpeUAcynwYnEhEf+C2+DT7+sW5FvhW9StATBksyX87S2juuKi2kP8hpMva1VmzMndbBKR9LhyuJ61JiSQu2pZNSDGXW17ried/uxEEn+4QqWdNjGlng5CChJRZD2n1Rk71ZJnSiIoluKNWSpEBGA9qhEmDZ4zic9f+OKp82s1CnJbIdBSCsB7HjaTnmlb90eGscXMR+dWhrtkiT9cbnUHx8UMf9JGVS/zwjeQ6oxQcl30aIY19MxY9XN6cic3RnoaukqKzsUN++NCQCDbtPBQxNTgA=="
    }
  ]
}
```

Last step: Push the signed targets metadata to the Torizon Cloud server: `$ uptane-sign targets push --repo myimagerepo`

Now, the targets metadata is signed using your offline ED25519 key on your Yubikey, and pushed to the Torizon Cloud
server. 

## RSASSA-PSS signatures

The process for generating RSASSA-PSS signatures is pretty much the same: 
1. Generate the RSA keys on your Yubikey
2. Increment version number and canonicalize Targets metadata
3. Sign this Targets metadata using the RSA signing key
4. Include the RSASSA-PSS signature in the signed metadata file
5. Push it to the server.

For generating RSA keys on a Yubikey, we can use the same command, except for the -A flag value, which should change
from `ED25519` to `RSA`, and the output pubkey filename appropriately.

The major difference is in generating the digital signature. yubikey-piv-tool does not support PSS, and thus we have to
use a different, low-level signing tool provided by OpenSC. For this, we should use `pkcs11-tool`, which provides a CLI
for interfacing with and using different hardware modules for various security-related purposes, such as signing,
generating digital certificates, etc.

After canonicalizing the Targets metadata, the following steps should be followed:
1. Generate the SHA256 hash of the canonicalized JSON: `$ shasum -a 256 canonicalized_targets.json | awk '{print $1}' | xxd -r -p > targets.sha256`
2. Then sign this file using `pkcs11-tool`: `$ pkcs11-tool --module /opt/homebrew/lib/libykcs11.dylib --sign -m RSA-PKCS-PSS --hash-algorithm SHA256 -i targets.sha256 -o signed_targets.sig`
3. Then convert it to base64: `base64 -i signed_targets.sig -o signed_targets_base64.sig`

Then, follow the same steps provided above to automatically add this external signature to the signed Targets metadata
and push it to the server.

## TL;DR

To sum up the whole process:

```shell
$ uptane-sign init --repo myimagerepo --credentials /path/to/credentials.zip
$ uptane-sign key generate --repo myimagerepo --name myroot --type ed25519
$ uptane-sign move-offline --repo myimagerepo --old-root-alias origroot --new-root myroot --new-targets mytargets
$ uptane-sign targets pull --repo myimagerepo

# insert Yubikey into your USB slot on your computer
$ yubico-piv-tool -a generate -s 9c -A ED25519 -k -o uptane-signing-key-ed25519.pem # replace -A value with RSA2048 for RSA keys
$ yubico-piv-tool -a verify-pin -a selfsign -s 9c -S '/CN=piv_auth/OU=test/O=example.com/' -i uptane-signing-key-ed25519.pem
$ yubico-piv-tool -a import-certificate -s 9c -k

# import this key material as a targets key
$ uptane-sign user-keys importpub -k uptane-signing-key-ed25519 -i uptane-signing-key-ed25519.pem
$ uptane-sign root targets-key add -k uptane-signing-key-ed25519 --repo myimagerepo
$ uptane-sign root sign -k origroot --repo myimagerepo` # origroot is the registered root on the server currently. After we push the new root metadata, we should use myroot 
$ uptane-sign root push --repo myimagerepo

# sign targets metadata
$ uptane-sign targets increment-version --repo myimagerepo
$ python3 -c "import json;import sys;sys.stdout.write(json.dumps(json.load(open('tuf/myimagerepo/roles/unsigned/targets.json','r')),separators=(',',':'),sort_keys=True,ensure_ascii=False,allow_nan=False));" > canonicalized_targets.json
```

For ED25519 signatures,
```shell
$ yubico-piv-tool -a verify-pin --sign -s 9c -H SHA256 -A ED25519 -i canonicalized_targets.json -o targets_signed.sig
$ base64 -i targets_signed.sig -o targets_signed_base64.sig
```

For RSASSA-PSS signatures,
```shell
$ shasum -a 256 canonicalized_targets.json | awk '{print $1}' | xxd -r -p > targets.sha256
$ pkcs11-tool --module /opt/homebrew/lib/libykcs11.dylib --sign -m RSA-PKCS-PSS --hash-algorithm SHA256 -i targets.sha256 -o signed_targets.sig
$ base64 -i signed_targets.sig -o targets_signed_base64.sig
```

After that,
```shell
$ uptane-sign targets sign --signatures uptane-signing-key-ed25519=$(cat targets_signed_base64.sig | tr -d '\n') --repo myimagerepo
$ uptane-sign targets push --repo myimagerepo
```
