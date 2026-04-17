with open(r'c:\Users\ASUS\Desktop\New folder\frontend\place-request.html', 'r', encoding='utf-8') as f:
    content = f.read()

index = content.find('</html>')
if index != -1:
    new_content = content[:index + 7]
    with open(r'c:\Users\ASUS\Desktop\New folder\frontend\place-request.html', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("File successfully repaired.")
else:
    print("Error: Could not find closing tag.")
