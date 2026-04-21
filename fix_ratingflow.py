
with open('components/RatingFlow.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# The file currently has the correct code from line 1 to 381.
# Everything after line 381 is the old code that needs to be deleted.
with open('components/RatingFlow.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines[:381])
print('Fixed RatingFlow.tsx')
