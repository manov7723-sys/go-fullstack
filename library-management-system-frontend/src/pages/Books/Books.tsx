import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { bookApi } from "../../services/api";
import { Book, BookSearchRequest } from "../../types";
import { Search, Grid, List, BookOpen, Eye } from "lucide-react";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Badge } from "../../components/ui/badge";

const Books: React.FC = () => {
  const [searchParams, setSearchParams] = useState<BookSearchRequest>({
    page: 1,
    limit: 12,
    sort: "title",
    order: "asc",
  });
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const {
    data: booksData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["books", searchParams],
    queryFn: () => bookApi.getBooks(searchParams),
  });

  const handleSearch = (search: string) => {
    setSearchParams((prev) => ({ ...prev, search, page: 1 }));
  };

  const handleFilter = (filters: Partial<BookSearchRequest>) => {
    setSearchParams((prev) => ({ ...prev, ...filters, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setSearchParams((prev) => ({ ...prev, page }));
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
  const totalPages = booksData?.pages || 1;
  const currentPage = searchParams.page || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Books</h1>
          <p className="text-muted-foreground">
            Browse and search through our collection of books
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search books by title, author, or ISBN..."
                className="pl-10"
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Select
                onValueChange={(value) =>
                  handleFilter({ category: value === "all" ? undefined : value })
                }
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Fiction">Fiction</SelectItem>
                  <SelectItem value="Non-Fiction">Non-Fiction</SelectItem>
                  <SelectItem value="Science">Science</SelectItem>
                  <SelectItem value="Technology">Technology</SelectItem>
                  <SelectItem value="History">History</SelectItem>
                  <SelectItem value="Biography">Biography</SelectItem>
                </SelectContent>
              </Select>

              <Select
                onValueChange={(value) =>
                  handleFilter({ sort: value as any })
                }
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Sort by Title" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="title">Sort by Title</SelectItem>
                  <SelectItem value="author">Sort by Author</SelectItem>
                  <SelectItem value="created_at">Sort by Date Added</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Books Grid/List */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {books.map((book) => (
            <BookListItem key={book.id} book={book} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="outline"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <Button
              key={page}
              variant={page === currentPage ? "default" : "outline"}
              onClick={() => handlePageChange(page)}
              size="sm"
            >
              {page}
            </Button>
          ))}
          <Button
            variant="outline"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {books.length === 0 && (
        <div className="text-center py-8">
          <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-medium text-foreground">
            No books found
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Try adjusting your search or filter criteria.
          </p>
        </div>
      )}
    </div>
  );
};

// Book Card Component
const BookCard: React.FC<{ book: Book }> = ({ book }) => {
  return (
    <Card className="hover:shadow-lg transition-all duration-200 hover:scale-105">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-foreground line-clamp-2 text-lg">
              {book.title}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              by {book.author}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              ISBN: {book.isbn}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              {book.category}
            </Badge>
            <div className="text-right">
              <p className="text-sm font-medium">
                {book.availableCopies}/{book.totalCopies}
              </p>
              <p className="text-xs text-muted-foreground">available</p>
            </div>
          </div>

          <Button asChild className="w-full">
            <Link to={`/books/${book.id}`}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Book List Item Component
const BookListItem: React.FC<{ book: Book }> = ({ book }) => {
  return (
    <div className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">{book.title}</h3>
              <p className="text-sm text-muted-foreground">by {book.author}</p>
              <div className="flex items-center space-x-4 mt-1">
                <span className="text-xs text-muted-foreground">
                  ISBN: {book.isbn}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  {book.category}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-foreground">
            {book.availableCopies}/{book.totalCopies} available
          </p>
          <Link
            to={`/books/${book.id}`}
            className="inline-flex items-center px-3 py-2 border border-input rounded-md text-sm font-medium bg-background text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Eye className="h-4 w-4 mr-1" />
            View
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Books;
