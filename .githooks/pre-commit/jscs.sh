echo "Running JSCS..."

./node_modules/.bin/jscs src

if [ $? -ne 0 ]; then
    echo "Found JSCS errors"
    exit 1
fi

echo "No JSCS errors"
