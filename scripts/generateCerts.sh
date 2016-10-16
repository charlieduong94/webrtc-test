#!/bin/bash

openssl req -x509 -newkey rsa:4096 -keyout ssl/server-key-old.pem -out ssl/server-cert.pem -days 365
openssl rsa -in ssl/server-key-old.pem -out ssl/server-key.pem
rm ssl/server-key-old.pem
