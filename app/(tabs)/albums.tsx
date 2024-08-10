import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  TextInput,
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Album = {
  id: string;
  title: string;
  previewUri?: string;
};

const ALBUMS_STORAGE_KEY = 'albums';

const AlbumsScreen: React.FC = () => {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [newAlbumName, setNewAlbumName] = useState<string>(''); 
  const [isNamingAlbum, setIsNamingAlbum] = useState<boolean>(false); 

  useEffect(() => {
    const fetchPermissions = async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    fetchPermissions();
  }, []);

  useEffect(() => {
    if (hasPermission) {
      loadAlbums();
    }
  }, [hasPermission]);

  useEffect(() => {
    const loadPersistedAlbums = async () => {
      try {
        const storedAlbums = await AsyncStorage.getItem(ALBUMS_STORAGE_KEY);
        if (storedAlbums) {
          setAlbums(JSON.parse(storedAlbums));
        }
      } catch (error) {
        console.error('Failed to load persisted albums:', error);
      }
    };

    loadPersistedAlbums();
  }, []);

  const saveAlbumsToStorage = async (albums: Album[]) => {
    try {
      await AsyncStorage.setItem(ALBUMS_STORAGE_KEY, JSON.stringify(albums));
    } catch (error) {
      console.error('Failed to save albums:', error);
    }
  };

  const loadAlbums = async () => {
    try {
      const albumList = await MediaLibrary.getAlbumsAsync();
      const formattedAlbums = await Promise.all(
        albumList.map(async (album) => {
          const previewUri = await getAlbumPreviewUri(album.id);
          return {
            id: album.id,
            title: album.title,
            previewUri,
          };
        })
      );
      setAlbums(formattedAlbums);
      await saveAlbumsToStorage(formattedAlbums); // Save albums after loading
    } catch (error) {
      console.error('Failed to load albums:', error);
    }
  };

  const createAlbum = () => {
    setIsNamingAlbum(true); 
  };

  const confirmCreateAlbum = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission to access media library is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      try {
        const mediaAssets = await Promise.all(
          result.assets.map(async (asset) => {
            if (asset.uri) {
              return await MediaLibrary.createAssetAsync(asset.uri);
            }
            throw new Error('Asset URI is missing');
          })
        );

        if (mediaAssets.length === 0) {
          alert('No valid assets found to create an album.');
          return;
        }

        const initialAsset = mediaAssets[0];
        let newAlbum = await MediaLibrary.getAlbumAsync(newAlbumName);
        if (!newAlbum) {
          newAlbum = await MediaLibrary.createAlbumAsync(newAlbumName, initialAsset, false);
        }

        await MediaLibrary.addAssetsToAlbumAsync(mediaAssets, newAlbum, false);
        await loadAlbums(); // Refresh the albums list
        alert(`Album '${newAlbumName}' created and photos added!`);
        await saveAlbumsToStorage([...albums, {
          id: newAlbum.id,
          title: newAlbum.title,
          previewUri: await getAlbumPreviewUri(newAlbum.id),
        }]); // Save albums after creating new one
      } catch (error) {
        if (error instanceof Error) {
          console.error('Failed to create album:', error.message);
          alert(`Failed to create album: ${error.message}`);
        } else {
          console.error('An unknown error occurred:', error);
          alert('An unknown error occurred.');
        }
      }
    } else {
      alert('No photos selected or failed to pick photos.');
    }

    setIsNamingAlbum(false); 
  };

  const deleteAlbum = async (albumId: string) => {
    Alert.alert(
      'Delete Album',
      'Are you sure you want to delete this album?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              await MediaLibrary.deleteAlbumsAsync([albumId], true);
              await loadAlbums(); // Refresh the albums list
              alert('Album deleted successfully.');
              await saveAlbumsToStorage(albums.filter(album => album.id !== albumId)); // Update storage after deletion
            } catch (error) {
              console.error('Failed to delete album:', error);
              alert('Failed to delete album.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const getAlbumPreviewUri = async (albumId: string): Promise<string> => {
    try {
      const { assets } = await MediaLibrary.getAssetsAsync({
        album: albumId,
        mediaType: ['photo'],
        first: 1,
      });

      if (assets.length > 0) {
        const asset = assets[0];
        return asset.uri || 'https://via.placeholder.com/150';
      }

      return 'https://via.placeholder.com/150';
    } catch (error) {
      console.error('Failed to fetch album preview:', error);
      return 'https://via.placeholder.com/150';
    }
  };

  const renderItem = ({ item }: { item: Album }) => (
    <View style={styles.albumContainer}>
      <Image source={{ uri: item.previewUri }} style={styles.previewImage} />
      <View style={styles.overlay}>
        <Text style={styles.albumName}>{item.title}</Text>
        <TouchableOpacity onPress={() => deleteAlbum(item.id)} style={styles.deleteButton}>
          <MaterialIcons name="delete" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.createButton} onPress={createAlbum}>
        <MaterialIcons name="add" size={24} color="white" />
        <Text style={styles.createButtonText}>Create Album</Text>
      </TouchableOpacity>
      <FlatList
        data={albums}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text>No albums available.</Text>}
        numColumns={2}
        columnWrapperStyle={styles.row}
      />
      {isNamingAlbum && (
        <View style={styles.namePromptContainer}>
          <Text style={styles.promptTitle}>Enter Album Name</Text>
          <TextInput
            style={styles.nameInput}
            placeholder="Album Name"
            value={newAlbumName}
            onChangeText={setNewAlbumName}
          />
          <TouchableOpacity style={styles.confirmButton} onPress={confirmCreateAlbum}>
            <Text style={styles.confirmButtonText}>Create</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setIsNamingAlbum(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#36454F' },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#052C4F',
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
  },
  createButtonText: { color: 'white', marginLeft: 5 },
  row: {
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  albumContainer: {
    flex: 1,
    marginHorizontal: 5,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 150,
    borderRadius: 5,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 10,
  },
  albumName: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  deleteButton: {
    alignSelf: 'flex-end',
  },
  namePromptContainer: {
    position: 'absolute',
    top: '50%',
    left: '10%',
    right: '10%',
    backgroundColor: '#052C4F',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  promptTitle: {
    fontSize: 18,
    color: 'white',
    marginBottom: 10,
  },
  nameInput: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  confirmButton: {
    backgroundColor: '#0A84FF',
    padding: 10,
    borderRadius: 5,
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  cancelButton: {
    marginTop: 10,
  },
  cancelButtonText: {
    color: 'white',
  },
});

export default AlbumsScreen;