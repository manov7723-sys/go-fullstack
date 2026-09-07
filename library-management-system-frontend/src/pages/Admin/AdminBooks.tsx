import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bookApi } from "../../services/api";
import { Book, BookCreateRequest, BookUpdateRequest } from "../../types";
import { Plus, Search, Edit, Trash2, BookOpen, User, Hash } from "lucide-react";
import { toast } from "react-hot-toast";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { useAlert } from "../../hooks/useAlert";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";

const AdminBooks: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  const queryClient = useQueryClient();
  const { confirm } = useAlert();

  // Fetch books
  const {
    data: booksData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["adminBooks", searchQuery],
    queryFn: () => bookApi.getAdminBooks({ search: searchQuery, limit: 50 }),
  });

  // Delete book mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => bookApi.deleteBook(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminBooks"] });
      toast.success("Book deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete book");
    },
  });

  const handleDeleteBook = (book: Book) => {
    confirm(
      "Delete Book",
      `Are you sure you want to delete "${book.title}"?`,
      () => deleteMutation.mutate(book.id),
      undefined,
      "Delete",
      "Cancel",
    );
  };

  const handleEditBook = (book: Book) => {
    setSelectedBook(book);
    setIsEditModalOpen(true);
  };

  const handleAddBook = () => {
    setSelectedBook(null);
    setIsAddModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">Failed to load books</p>
      </div>
    );
  }

  const books = booksData?.books || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manage Books</h1>
          <p className="text-muted-foreground">
            Add, edit, and manage library books
          </p>
        </div>
        <Button onClick={handleAddBook}>
          <Plus className="h-4 w-4" />
          <span>Add Book</span>
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
        <Input
          type="text"
          placeholder="Search books by title, author, or ISBN..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Books Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Book</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>ISBN</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Copies</TableHead>
                <TableHead>Available</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {books.map((book) => (
                <TableRow key={book.id}>
                  <TableCell>
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <BookOpen className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-foreground">
                          {book.title}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {book.description?.substring(0, 50)}...
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <User className="h-4 w-4 text-muted-foreground mr-2" />
                      <span className="text-sm text-foreground">
                        {book.author}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Hash className="h-4 w-4 text-muted-foreground mr-2" />
                      <span className="text-sm text-foreground">
                        {book.isbn}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{book.category}</Badge>
                  </TableCell>
                  <TableCell>{book.totalCopies}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        book.availableCopies > 0 ? "default" : "destructive"
                      }
                    >
                      {book.availableCopies}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditBook(book)}
                        title="Edit book"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteBook(book)}
                        title="Delete book"
                        className="text-destructive hover:text-destructive/80"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {books.length === 0 && (
          <div className="text-center py-8">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-medium text-foreground">
              No books found
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {searchQuery
                ? "Try adjusting your search terms."
                : "Get started by adding a new book."}
            </p>
          </div>
        )}
      </Card>

      {/* Add/Edit Book Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <BookModal
          book={selectedBook}
          isOpen={isAddModalOpen || isEditModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setIsEditModalOpen(false);
            setSelectedBook(null);
          }}
          onSuccess={() => {
            setIsAddModalOpen(false);
            setIsEditModalOpen(false);
            setSelectedBook(null);
            queryClient.invalidateQueries({ queryKey: ["adminBooks"] });
          }}
        />
      )}
    </div>
  );
};

// Book Modal Component
interface BookModalProps {
  book: Book | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const BookModal: React.FC<BookModalProps> = ({
  book,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<BookCreateRequest>({
    title: book?.title || "",
    author: book?.author || "",
    isbn: book?.isbn || "",
    category: book?.category || "",
    description: book?.description || "",
    copies: book?.totalCopies || 1,
  });

  const createMutation = useMutation({
    mutationFn: (data: BookCreateRequest) => bookApi.createBook(data),
    onSuccess: () => {
      toast.success("Book created successfully");
      onSuccess();
    },
    onError: () => {
      toast.error("Failed to create book");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: BookUpdateRequest) => bookApi.updateBook(book!.id, data),
    onSuccess: () => {
      toast.success("Book updated successfully");
      onSuccess();
    },
    onError: () => {
      toast.error("Failed to update book");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (book) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          {book ? "Edit Book" : "Add New Book"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              type="text"
              required
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
            />
          </div>

          <div>
            <Label htmlFor="author">Author</Label>
            <Input
              id="author"
              type="text"
              required
              value={formData.author}
              onChange={(e) =>
                setFormData({ ...formData, author: e.target.value })
              }
            />
          </div>

          <div>
            <Label htmlFor="isbn">ISBN</Label>
            <Input
              id="isbn"
              type="text"
              required
              value={formData.isbn}
              onChange={(e) =>
                setFormData({ ...formData, isbn: e.target.value })
              }
            />
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Select
              required
              value={formData.category}
              onValueChange={(value) =>
                setFormData({ ...formData, category: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Fiction">Fiction</SelectItem>
                <SelectItem value="Non-Fiction">Non-Fiction</SelectItem>
                <SelectItem value="Science">Science</SelectItem>
                <SelectItem value="History">History</SelectItem>
                <SelectItem value="Technology">Technology</SelectItem>
                <SelectItem value="Biography">Biography</SelectItem>
                <SelectItem value="Self-Help">Self-Help</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="copies">Total Copies</Label>
            <Input
              id="copies"
              type="number"
              required
              min="1"
              value={formData.copies}
              onChange={(e) =>
                setFormData({ ...formData, copies: parseInt(e.target.value) })
              }
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <LoadingSpinner size="sm" />
              ) : book ? (
                "Update Book"
              ) : (
                "Add Book"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminBooks;
