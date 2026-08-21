import os
import numpy as np
import openpyxl
import copy


wb = openpyxl.load_workbook("raw_submissions.xlsx", data_only=True)
ws = wb.active

ids_raw = ws['C1'].value
results = np.array([int(x.strip().zfill(2)) for x in str(ids_raw).split(",") if x.strip()])

results = np.array([1,0,2,42,15,16,17,14,22,10,11,44,21,22,6,24,25,26,27,28,29,7,18,13,12,45,37], dtype = np.int16)

cross = np.array([[0,0,1,0,0],
                  [0,0,1,0,0],
                  [1,1,1,1,1],
                  [0,0,1,0,0],
                  [0,0,1,0,0]])

center = np.array([[0,0,0,0,0],
                   [0,1,1,1,0],
                   [0,1,1,1,0],
                   [0,1,1,1,0],
                   [0,0,0,0,0]])

full = np.ones((5,5)).astype(int)

square = 1 - center

X = np.logical_or(np.identity(5), np.flip(np.identity(5), axis=1)).astype(int)

diamond = np.array([[0,0,1,0,0],
                    [0,1,0,1,0],
                    [1,0,0,0,1],
                    [0,1,0,1,0],
                    [0,0,1,0,0]])

shapes = {'Cross': cross, 'Center Box': center, 'Full Form': full, 'Square': square, 'X': X, 'Diamond': diamond}


def shape_check(card):
    shape_counter = 0
    for shape in shapes:
        if np.array_equal(shapes[shape] * card, shapes[shape]):
            print(f'{shape} achieved!')
            shape_counter += 1
    return shape_counter
            

def bingo_check(card):
    bingo_counter = 0
    diagonal_bingo_1 = True  
    diagonal_bingo_2 = True 
    card_flip = np.flip(card, axis =1)
    
    for i in range(0,len(card)):
        
        if np.array_equal(card[i],[1,1,1,1,1]):
            #print(f'Bingo! (Row {i+1})')
            bingo_counter += 1
        
        if np.array_equal(card.T[i],[1,1,1,1,1]):
            #print(f'Bingo! (Column {i+1})')
            bingo_counter += 1
        
        if card[i,i] == 1:
            diagonal_bingo_1 *= True
        else:
            diagonal_bingo_1 *= False
        
        if card_flip[i,i] == 1:
            diagonal_bingo_2 *= True
        else:
            diagonal_bingo_2 *= False
        
    if diagonal_bingo_1:
        #print('Diagonal 1 is a Bingo!')
        bingo_counter += 1
    if diagonal_bingo_2:
        #print('Diagonal 2 is a Bingo!')
        bingo_counter += 1
        
    return bingo_counter
        

def lonely_bingo_check(card):
    lonely_bingo_counter = 0
    card_pad = np.pad(card,(1,1),'constant', constant_values=(0, 0))
    card_pad_T = card_pad.T
    for i in range(1,len(card)+1):
        row_above = np.array_equal(card_pad[i-1],np.zeros_like(card_pad[i]))
        row_bingo = np.array_equal(card_pad[i],[0,1,1,1,1,1,0])
        row_below = np.array_equal(card_pad[i+1],np.zeros_like(card_pad[i]))
        if row_above and row_bingo and row_below:
            #print(f"Row {i} is a lonely Bingo!")
            lonely_bingo_counter += 1

    for i in range(1,len(card)+1):        
        column_left = np.array_equal(card_pad_T[i-1],np.zeros_like(card_pad_T[i]))
        column_bingo = np.array_equal(card_pad_T[i],[0,1,1,1,1,1,0])
        column_right = np.array_equal(card_pad_T[i+1],np.zeros_like(card_pad_T[i]))
        if column_left and column_bingo and column_right:
            #print(f"Column {i} is a lonely Bingo!")
            lonely_bingo_counter += 1
    
    card_flip = np.flip(card_pad, axis =1)       
    diagonal_lonely_bingo = True
    for i in range(1,len(card)+1):
        if card_pad[i,i] == 1 and card_pad[i,i-1] == 0 and card_pad[i,i+1] == 0:
            diagonal_lonely_bingo *= True
        elif card_flip[i,i] == 1 and card_flip[i,i-1] == 0 and card_flip[i,i+1] == 0:
            diagonal_lonely_bingo *= True
        else:
            diagonal_lonely_bingo = False
            break
        
    if diagonal_lonely_bingo:
        #print('\nDiagonal is a lonely Bingo!')
        lonely_bingo_counter += 1
        
    return lonely_bingo_counter


def scorecard_maker(card, results_arr):
    return np.isin(card, results_arr).astype(int)


participants = os.listdir("forms/")
scorecards = []
for person in participants:
    print('')
    card = np.load('forms/' + person)
    print(f'{person[:-4]}:')
    print(card)
    for i in range(0,len(results)):
        temp_card = scorecard_maker(card, results[:i+1])
        #print(temp_card)
        first_bingo = i+1
        if bingo_check(temp_card) > 0:
            break
        
    truth_card = scorecard_maker(card, results)
    print(truth_card)
        
    scorecard = {'N_fields': int(np.sum(truth_card)), 'N_Bingos': bingo_check(truth_card), 'N_LonelyBingos': lonely_bingo_check(truth_card), 'N_shapes': shape_check(truth_card), 'First_Bingo': first_bingo, 'First_field': results[0] in card}
    print(scorecard)
    scorecards.append(scorecard)
    
scorecards_flipped = {k: np.array([d[k] for d in scorecards]) for k in scorecards[0]}
    
    
# Calculate most bingos score
pointcards_flipped = copy.deepcopy(scorecards_flipped)
N_fields = pointcards_flipped["N_fields"]
points = np.zeros_like(N_fields)
score_map = [12,10,8,7,6,5,4,3,2,1]
unique_vals = np.unique(N_fields)[::-1]

for val, score in zip(unique_vals, score_map):
    points[N_fields == val] = score + val

pointcards_flipped["N_fields"] = points
    
    
# Calculate most bingos score
N_bingos = pointcards_flipped["N_Bingos"]
points = np.zeros_like(N_bingos)
score_map = [12,6,3]
unique_vals = np.unique(N_bingos[N_bingos != 0])[::-1]

for val, score in zip(unique_vals, score_map):
    points[N_bingos == val] = score
    
points[N_bingos == 0] = 2 # 2 points for no bingos
pointcards_flipped["N_Bingos"] = points

# Calculate 7 points for each lonely bingos
pointcards_flipped["N_LonelyBingos"] *= 7

# Calculate 4 points for each shape
pointcards_flipped["N_shapes"] *= 4

# Calculate 6 points for first bingo
first_Bingo = pointcards_flipped["First_Bingo"]
points = np.zeros_like(first_Bingo)
points[first_Bingo == first_Bingo.min()] = 6
pointcards_flipped["First_Bingo"] = points

# Calculate 4 points for first field
pointcards_flipped["First_field"] = pointcards_flipped["First_field"].astype(int) * 4
print(scorecards_flipped)


print(pointcards_flipped)
keys = pointcards_flipped.keys()
pointcards = [dict(zip(keys, values)) for values in zip(*pointcards_flipped.values())]
print(pointcards)


# Add together all points
for i in range(0,len(participants)):
    print('')
    print(f'{participants[i][:-4]}:')
    print(f'{np.sum(list(pointcards[i].values()))} points')